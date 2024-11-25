import BN from 'bn.js';
import syscointx from 'syscointx-js';

import * as utils from './utils';

export class Syscoin {
  public Signer;
  public blockbookURL;
  public network;

  constructor(SignerIn: any, blockbookURL: string, network: any) {
    this.blockbookURL = blockbookURL;
    if (SignerIn) {
      this.Signer = SignerIn;
      this.Signer.blockbookURL = blockbookURL;
      this.Signer.Signer.blockbookURL = blockbookURL;
      this.network = network || this.Signer.Signer.network;
    } else {
      this.Signer = null;
      this.network = network || utils.syscoinNetworks.mainnet;
    }
  }

  // proxy to signAndSend
  public signAndSendWithSigner = async (
    psbt: any,
    SignerIn: any,
    notaryAssets: any,
    pathIn: any
  ) => {
    return this.signAndSend(psbt, notaryAssets, SignerIn, pathIn);
  };
  /* createPSBTFromRes
  Purpose: Craft PSBT from res object. Detects witness/non-witness UTXOs and sets appropriate data required for bitcoinjs-lib to sign properly
  Param res: Required. The resulting object passed in which is assigned from syscointx.createTransaction()/syscointx.createAssetTransaction()
  Param redeemOrWitnessScript: Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
  Param redeemOrWitness: Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
    Field script. Required. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
    Field path. Optional. The HD bip32 path of how the Signer can sign inputs inside of script
  Returns: psbt from bitcoinjs-lib
  */
  public createPSBTFromRes = async (res: any, redeemOrWitnessScript: any) => {
    const psbt = new utils.bitcoinjs.Psbt({ network: this.network });
    const prevTx = new Map();
    psbt.setVersion(res.txVersion);
    for (let i = 0; i < res.inputs.length; i++) {
      const input = res.inputs[i];
      const inputObj = {
        hash: input.txId,
        index: input.vout,
        sequence: input.sequence,
        bip32Derivation: [],
      } as any;
      // if legacy address type get previous tx as required by bitcoinjs-lib to sign without witness
      // Note: input.address is only returned by Blockbook XPUB UTXO API and not address UTXO API and this address is used to assign type
      if (input.type === 'LEGACY') {
        if (prevTx.has(input.txId)) {
          inputObj.nonWitnessUtxo = prevTx.get(input.txId);
        } else {
          const hexTx = await utils.fetchBackendRawTx(
            this.blockbookURL,
            input.txId
          );
          if (hexTx) {
            const bufferTx = Buffer.from(hexTx.hex, 'hex');
            prevTx.set(input.txId, bufferTx);
            inputObj.nonWitnessUtxo = bufferTx;
          } else {
            console.log(
              'Could not fetch input transaction for legacy UTXO: ' + input.txId
            );
          }
          if (redeemOrWitnessScript) {
            inputObj.redeemScript = redeemOrWitnessScript;
          }
        }
      } else {
        inputObj.witnessUtxo = {
          script: utils.bitcoinjs.address.toOutputScript(
            input.address,
            this.network
          ),
          value: input.value.toNumber(),
        };
        if (redeemOrWitnessScript) {
          inputObj.witnessScript = redeemOrWitnessScript;
        }
      }
      psbt.addInput(inputObj);
      if (input.address) {
        psbt.addUnknownKeyValToInput(i, {
          key: Buffer.from('address'),
          value: Buffer.from(input.address),
        });
      }
      if (input.path) {
        psbt.addUnknownKeyValToInput(i, {
          key: Buffer.from('path'),
          value: Buffer.from(input.path),
        });
      }
    }
    res.outputs.forEach((output: any) => {
      psbt.addOutput({
        script: output.script,
        address: output.script ? null : output.address,
        value: output.value.toNumber(),
      });
    });
    return psbt;
  };
  /* signAndSend
  Purpose: Signs/Notarizes if necessary and Sends transaction to network using Signer
  Param psbt: Required. The resulting PSBT object passed in which is assigned from syscointx.createTransaction()/syscointx.createAssetTransaction()
  Param notaryAssets: Optional. Asset objects that are required for notarization, fetch signatures via fetchNotarizationFromEndPoint()
  Param SignerIn: Optional. Signer used to sign transaction
  Returns: PSBT signed success or unsigned if failure
  */
  public signAndSend = async (
    psbt: any,
    notaryAssets: any,
    SignerIn: any,
    pathIn: any
  ) => {
    // notarize if necessary
    const Signer = SignerIn || this.Signer;
    const psbtClone = psbt.clone();
    psbt = await Signer.sign(psbt, pathIn);
    let tx = null;
    // if not complete, we shouldn't notarize or try to send to network must get more signatures so return it to client
    try {
      // will fail if not complete
      tx = psbt.extractTransaction();
    } catch (err) {
      console.log('Transaction incomplete, requires more signatures...');
      return psbt;
    }
    if (notaryAssets) {
      // check to see if notarization was already done
      console.log('check to see if notarization was already done');
      const allocations = utils.getAllocationsFromTx(tx);
      const emptySig = Buffer.alloc(65, 0);
      let needNotary = false;
      for (let i = 0; i < allocations.length; i++) {
        // if notarySignature exists and is an empty signature (default prior to filling) then we need to notarize this asset allocation send
        if (
          allocations[i].notarysig &&
          allocations[i].notarysig.length > 0 &&
          allocations[i].notarysig.equals(emptySig)
        ) {
          needNotary = true;
          break;
        }
      }
      // if notarization is required
      if (needNotary) {
        const notarizedDetails = await utils.notarizePSBT(
          psbt,
          notaryAssets,
          psbt.extractTransaction().toHex()
        );
        if (notarizedDetails && notarizedDetails.output) {
          psbt = utils.copyPSBT(
            psbtClone,
            notarizedDetails.index,
            notarizedDetails.output
          );
          psbt = await Signer.sign(psbt, pathIn);
          try {
            // will fail if not complete
            psbt.extractTransaction();
          } catch (err) {
            console.log('Transaction incomplete, requires more signatures...');
            return psbt;
          }
        } else {
          return psbt;
        }
      }
    }
    if (this.blockbookURL) {
      const resSend = await utils.sendRawTransaction(
        this.blockbookURL,
        psbt.extractTransaction().toHex(),
        Signer
      );
      if (resSend.error) {
        throw Object.assign(
          new Error('could not send tx! error: ' + resSend.error.message),
          { code: 402 }
        );
      } else if (resSend.result) {
        console.log('tx successfully sent! txid: ' + resSend.result);
        return psbt;
      } else {
        throw Object.assign(
          new Error('Unrecognized response from backend: ' + resSend),
          { code: 402 }
        );
      }
    }
    return psbt;
  };

  /* signAndSendWithWIF
  Purpose: Signs/Notarizes if necessary and Sends transaction to network using WIF
  Param psbt: Required. The resulting PSBT object passed in which is assigned from syscointx.createTransaction()/syscointx.createAssetTransaction()
  Param wif: Required. Private key in WIF format to sign inputs of the transaction for
  Param notaryAssets: Optional. Asset objects that are required for notarization, fetch signatures via fetchNotarizationFromEndPoint()
  Returns: PSBT signed success or unsigned if failure
  */
  public signAndSendWithWIF = async (
    psbt: any,
    wif: any,
    notaryAssets: any
  ) => {
    // notarize if necessary
    const psbtClone = psbt.clone();
    psbt = await utils.signWithWIF(psbt, wif, this.network);
    let tx = null;
    // if not complete, we shouldn't notarize or try to send to network must get more signatures so return it to client
    try {
      // will fail if not complete
      tx = psbt.extractTransaction();
    } catch (err) {
      return psbt;
    }
    if (notaryAssets) {
      // check to see if notarization was already done
      const allocations = utils.getAllocationsFromTx(tx);
      const emptySig = Buffer.alloc(65, 0);
      let needNotary = false;
      for (let i = 0; i < allocations.length; i++) {
        // if notarySignature exists and is an empty signature (default prior to filling) then we need to notarize this asset allocation send
        if (
          allocations[i].notarysig &&
          allocations[i].notarysig.length > 0 &&
          allocations[i].notarysig.equals(emptySig)
        ) {
          needNotary = true;
          break;
        }
      }
      // if notarization is required
      if (needNotary) {
        const notarizedDetails = await utils.notarizePSBT(
          psbt,
          notaryAssets,
          psbt.extractTransaction().toHex()
        );
        if (notarizedDetails && notarizedDetails.output) {
          psbt = utils.copyPSBT(
            psbtClone,
            this.network,
            notarizedDetails.index,
            notarizedDetails.output
          );
          psbt = await utils.signWithWIF(psbt, wif, this.network);
          try {
            // will fail if not complete
            psbt.extractTransaction();
          } catch (err) {
            return psbt;
          }
        } else {
          return psbt;
        }
      }
    }
    if (this.blockbookURL) {
      const resSend = await utils.sendRawTransaction(
        this.blockbookURL,
        psbt.extractTransaction().toHex()
      );
      if (resSend.error) {
        throw Object.assign(
          new Error('could not send tx! error: ' + resSend.error.message),
          { code: 402 }
        );
      } else if (resSend.result) {
        console.log('tx successfully sent! txid: ' + resSend.result);
        return psbt;
      } else {
        throw Object.assign(
          new Error('Unrecognized response from backend: ' + resSend),
          { code: 402 }
        );
      }
    }
    return psbt;
  };

  /* fetchAndSanitizeUTXOs
  Purpose: Fetch UTXO's for an address or XPUB from backend Blockbook provider and sanitize them for use by upstream libraries
  Param utxos: Optional. Pass in specific utxos to fund a transaction.
  Param fromXpubOrAddress: Optional. If wanting to fund from specific XPUB's or addresses specify this field should be set. Can be an array of XPUB or addresses in combination.
  Param txOpts: Optional. Transaction options. Fields are described below:
    Field rbf. Optional. True by default. Replace-by-fee functionality allowing one to bump transaction by increasing fee for UTXOs used.
    Field assetWhiteList. Optional. null by default. Allows UTXO's to be added from assets in the whitelist or the asset being sent
  Param assetMap: Optional (For asset transactions only). Description of Map:
    Index assetGuid. Required. Numeric Asset GUID you are sending to
    Value is described below:
      Field changeAddress. Optional. Where asset change outputs will be sent to. If it is not there or null a new change address will be created. If Signer is not set, it will send asset change outputs to sysChangeAddress
      Field outputs. Required. Array of objects described below:
        Field value. Required. Big Number representing satoshi's to send. Should be 0 if doing an update.
        Field address. Optional. Destination address for asset.
    Example:
      const assetMap = new Map([
        [assetGuid, { outputs: [{ value: new BN(0), address: 'tsys1qdflre2yd37qtpqe2ykuhwandlhq04r2td2t9ae' }] }]
      ])
      Would update assetGuid asset and send it as change back to 'tsys1qdflre2yd37qtpqe2ykuhwandlhq04r2td2t9ae'. Change is the 0-value UTXO for asset ownership.
  Param excludeZeroConf: Optional. False by default. Filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
  Returns: Returns JSON object in response, sanitized UTXO object array in JSON
  */
  public fetchAndSanitizeUTXOs = async (
    utxos: any,
    fromXpubOrAddress: any,
    txOpts: any,
    assetMap: any,
    excludeZeroConf: any
  ) => {
    if (!utxos) {
      if (fromXpubOrAddress) {
        if (!Array.isArray(fromXpubOrAddress)) {
          fromXpubOrAddress = [fromXpubOrAddress];
        }
        const utxoRequests: any[] = [];
        const concatSanitizedUTXOS: any = {};
        fromXpubOrAddress.forEach((addressOrXpub: any) =>
          utxoRequests.push(
            utils.fetchBackendUTXOS(this.blockbookURL, addressOrXpub)
          )
        );
        const responses = await Promise.all(utxoRequests);
        responses.forEach((response) => {
          const utxos = utils.sanitizeBlockbookUTXOs(
            response.addressOrXpub,
            response,
            this.network,
            txOpts,
            assetMap,
            excludeZeroConf
          ) as any;
          if (!concatSanitizedUTXOS.utxos) {
            concatSanitizedUTXOS.utxos = utxos.utxos;
          } else {
            concatSanitizedUTXOS.utxos = [...concatSanitizedUTXOS.utxos].concat(
              [...utxos.utxos]
            );
          }
          if (!concatSanitizedUTXOS.assets && utxos.assets) {
            concatSanitizedUTXOS.assets = utxos.assets;
          } else if (concatSanitizedUTXOS.assets && utxos.assets) {
            concatSanitizedUTXOS.assets = new Map(
              [...concatSanitizedUTXOS.assets].concat([...utxos.assets])
            );
          }
        });
        utxos = concatSanitizedUTXOS;
        utxos.utxos = Object.values(utxos.utxos).reduce(function (r: any, k) {
          return r.concat(k);
        }, []);
      } else if (this.Signer) {
        utxos = await utils.fetchBackendUTXOS(
          this.blockbookURL,
          this.Signer.getAccountXpub()
        );
        utxos = utils.sanitizeBlockbookUTXOs(
          fromXpubOrAddress,
          utxos,
          this.network,
          txOpts,
          assetMap,
          excludeZeroConf
        );
      }
    } else {
      utxos = utils.sanitizeBlockbookUTXOs(
        fromXpubOrAddress,
        utxos,
        this.network,
        txOpts,
        assetMap,
        excludeZeroConf
      );
    }
    return utxos;
  };

  /* createTransaction
  Purpose: Send Syscoin or Bitcoin or like coins.
  Param txOpts: Optional. Transaction options. Fields are described below:
    Field rbf. Optional. True by default. Replace-by-fee functionality allowing one to bump transaction by increasing fee for UTXOs used.
    Field assetWhiteList. Optional. null by default. Allows UTXO's to be added from assets in the whitelist or the asset being sent
  Param changeAddress: Optional. Change address if defined is where change outputs are sent to. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
  Param outputsArr: Required. Output array defining tuples to which addresses to send coins to and how much
  Param feeRate: Optional. Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
  Param fromXpubOrAddress: Optional. If wanting to fund from a specific XPUB or address specify this field should be set
  Param utxos: Optional. Pass in specific utxos to fund a transaction.
  Param redeemOrWitnessScript: Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
  Param inputsArr: Optional. Force these inputs to be included in the transaction, not to be confused with 'utxos' which is optional inputs that *may* be included as part of the funding process.
  Returns: PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
  */
  public createTransaction = async (
    txOpts: any,
    changeAddress: any,
    outputsArr: any,
    feeRate: any,
    fromXpubOrAddress: any,
    utxos: any,
    redeemOrWitnessScript: any,
    inputsArr: any
  ) => {
    if (this.Signer) {
      if (!changeAddress) {
        changeAddress = await this.Signer.getNewChangeAddress();
      }
    }
    utxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      fromXpubOrAddress,
      txOpts,
      undefined,
      undefined
    );
    if (inputsArr) {
      inputsArr = utils.sanitizeBlockbookUTXOs(
        fromXpubOrAddress,
        inputsArr,
        this.network,
        txOpts
      ).utxos;
    }
    const res = syscointx.createTransaction(
      txOpts,
      utxos,
      changeAddress,
      outputsArr,
      feeRate,
      inputsArr
    );

    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript);

    if (fromXpubOrAddress || !this.Signer) {
      return {
        psbt: psbt,
        res: psbt,
        assets: utils.getAssetsRequiringNotarization(psbt, utxos.assets),
      };
    }
    return await this.signAndSend(
      psbt,
      utils.getAssetsRequiringNotarization(psbt, utxos.assets),
      undefined,
      undefined
    );
  };

  /* assetSend
  Purpose: Issue supply by sending it from asset to an address holding an allocation of the asset.
  Param txOpts: Optional. Transaction options. Fields are described below:
    Field rbf. Optional. True by default. Replace-by-fee functionality allowing one to bump transaction by increasing fee for UTXOs used.
    Field assetWhiteList. Optional. null by default. Allows UTXO's to be added from assets in the whitelist or the asset being sent
  Param assetMap: Required. Description of Map:
    Index assetGuid. Required. Numeric Asset GUID you are sending to as string
    Value is described below:
      Field changeAddress. Optional. Where asset change outputs will be sent to. If it is not there or null a new change address will be created. If Signer is not set, it will send asset change outputs to sysChangeAddress
      Field outputs. Required. Array of objects described below:
        Field value. Required. Big Number representing satoshi's to send
        Field address. Required. Destination address for value.
    Example:
      const assetMap = new Map([
        [assetGuid, { outputs: [{ value: new BN(1000), address: 'tsys1qdflre2yd37qtpqe2ykuhwandlhq04r2td2t9ae' }] }]
      ])
      Would send 1000 satoshi to address 'tsys1qdflre2yd37qtpqe2ykuhwandlhq04r2td2t9ae' in asset 'assetGuid'
  Param sysChangeAddress: Optional. Change address if defined is where Syscoin only change outputs are sent to. Does not apply to asset change outputs which are definable in the assetOpts object. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
  Param feeRate: Optional. Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
  Param sysFromXpubOrAddress: Optional. If wanting to fund from a specific XPUB or address specify this field should be set
  Param utxos: Optional. Pass in specific utxos to fund a transaction.
  Param redeemOrWitnessScript: Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
  Returns: PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
  */
  public assetSend = async (
    txOpts: any,
    assetMapIn: any,
    sysChangeAddress: any,
    feeRate: any,
    sysFromXpubOrAddress: any,
    utxos: any,
    redeemOrWitnessScript: any
  ) => {
    if (this.Signer) {
      if (!sysChangeAddress) {
        sysChangeAddress = await this.Signer.getNewChangeAddress();
      }
    }
    const BN_ZERO = new BN(0);
    const assetMap = new Map();
    // create new map with base ID's setting zero val output in the base asset outputs array
    for (const [assetGuid, valueAssetObj] of assetMapIn.entries()) {
      const baseAssetID = utils.getBaseAssetID(assetGuid);
      // if NFT
      if (baseAssetID !== assetGuid) {
        // likely NFT issuance only with no base value asset issued, create new base value object so assetSend can perform proof of ownership
        if (!assetMapIn.has(baseAssetID)) {
          const valueBaseAssetObj = {
            outputs: [{ address: sysChangeAddress, value: BN_ZERO }],
          } as any;
          valueBaseAssetObj.changeAddress = sysChangeAddress;
          assetMap.set(baseAssetID, valueBaseAssetObj);
        }
        assetMap.set(assetGuid, valueAssetObj);
        // regular FT
      } else {
        valueAssetObj.outputs.push({
          address: sysChangeAddress,
          value: BN_ZERO,
        });
        valueAssetObj.changeAddress = sysChangeAddress;
        assetMap.set(assetGuid, valueAssetObj);
      }
    }
    if (this.Signer) {
      for (const valueAssetObj of assetMap.values()) {
        if (!valueAssetObj.changeAddress) {
          valueAssetObj.changeAddress = await this.Signer.getNewChangeAddress();
        }
      }
    }
    // true last param for filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
    utxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      sysFromXpubOrAddress,
      txOpts,
      assetMap,
      true
    );
    const res = syscointx.assetSend(
      txOpts,
      utxos,
      assetMap,
      sysChangeAddress,
      feeRate
    );
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript);
    if (sysFromXpubOrAddress || !this.Signer) {
      return {
        psbt: psbt,
        res: psbt,
        assets: utils.getAssetsRequiringNotarization(psbt, utxos.assets),
      };
    }
    return await this.signAndSend(
      psbt,
      utils.getAssetsRequiringNotarization(psbt, utxos.assets),
      undefined,
      undefined
    );
  };

  /* assetAllocationSend
  Purpose: Send an asset allocations to other users.
  Param txOpts: Optional. Transaction options. Fields are described below:
    Field rbf. Optional. True by default. Replace-by-fee functionality allowing one to bump transaction by increasing fee for UTXOs used.
    Field assetWhiteList. Optional. null by default. Allows UTXO's to be added from assets in the whitelist or the asset being sent
    Field memo. Optional. An optional data carrying byte field to include in the transaction.
    Field memoHeader. Optional. Header that prefixes memo field, memo + memoHeader is max 80 bytes
  Param assetMap: Required. Description of Map:
    Index assetGuid. Required. Numeric Asset GUID you are sending to
    Value is described below:
      Field changeAddress. Optional. Where asset change outputs will be sent to. If it is not there or null a new change address will be created. If Signer is not set, it will send asset change outputs to sysChangeAddress
      Field outputs. Required. Array of objects described below:
        Field value. Required. Big Number representing satoshi's to send
        Field address. Required. Destination address for value.
    Example:
      const assetMap = new Map([
        [assetGuid, { outputs: [{ value: new BN(1000), address: 'tsys1qdflre2yd37qtpqe2ykuhwandlhq04r2td2t9ae' }] }]
      ])
      Would send 1000 satoshi to address 'tsys1qdflre2yd37qtpqe2ykuhwandlhq04r2td2t9ae' in asset 'assetGuid'
  Param sysChangeAddress: Optional. Change address if defined is where Syscoin only change outputs are sent to. Does not apply to asset change outputs which are definable in the assetOpts object. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
  Param feeRate: Optional. Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
  Param sysFromXpubOrAddress: Optional. If wanting to fund from a specific XPUB or address specify this field should be set
  Param utxos: Optional. Pass in specific utxos to fund a transaction.
  Param res: Required. The resulting object passed in which is assigned from syscointx.createTransaction()/syscointx.createAssetTransaction()
  Param redeemOrWitnessScript: Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
  Returns: PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
  */
  public assetAllocationSend = async (
    txOpts: any,
    assetMap: any,
    sysChangeAddress: any,
    feeRate: any,
    sysFromXpubOrAddress: any,
    utxos: any,
    redeemOrWitnessScript: any
  ) => {
    if (this.Signer) {
      for (const valueAssetObj of assetMap.values()) {
        if (!valueAssetObj.changeAddress) {
          valueAssetObj.changeAddress = await this.Signer.getNewChangeAddress();
        }
      }
      if (!sysChangeAddress) {
        sysChangeAddress = await this.Signer.getNewChangeAddress();
      }
    }
    // false last param for filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
    utxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      sysFromXpubOrAddress,
      txOpts,
      assetMap,
      false
    );
    const res = syscointx.assetAllocationSend(
      txOpts,
      utxos,
      assetMap,
      sysChangeAddress,
      feeRate
    );
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript);
    if (sysFromXpubOrAddress || !this.Signer) {
      return {
        psbt: psbt,
        res: psbt,
        assets: utils.getAssetsRequiringNotarization(psbt, utxos.assets),
      };
    }
    return await this.signAndSend(
      psbt,
      utils.getAssetsRequiringNotarization(psbt, utxos.assets),
      undefined,
      undefined
    );
  };

  /* assetAllocationBurn
  Purpose: Burn an asset allocation for purpose of provably burning. Could be used to create proof-of-burn for SysEthereum bridge by specifying the ethaddress as destination in assetOpts.
  Param assetOpts: Optional. Fields described below:
    Field ethaddress. Optional. If burning for purpose of sending over SysEthereum bridge specify the destination Ethereum address where tokens should be sent to on Ethereum.
  Param txOpts: Optional. Transaction options. Fields are described below:
    Field rbf. Optional. True by default. Replace-by-fee functionality allowing one to bump transaction by increasing fee for UTXOs used.
    Field assetWhiteList. Optional. null by default. Allows UTXO's to be added from assets in the whitelist or the asset being sent
  Param assetMap: Required. Description of Map:
    Index assetGuid. Required. Numeric Asset GUID you are sending to
    Value is described below:
      Field changeAddress. Optional. Where asset change outputs will be sent to. If it is not there or null a new change address will be created. If Signer is not set, it will send asset change outputs to sysChangeAddress
      Field outputs. Required. Array of objects described below:
        Field value. Required. Big Number representing satoshi's to burn
    Example:
      const assetMap = new Map([
        [assetGuid, { outputs: [{ value: new BN(1000) }] }]
      ])
      Would burn 1000 satoshi in asset 'assetGuid'
  Param sysChangeAddress: Optional. Change address if defined is where Syscoin only change outputs are sent to. Does not apply to asset change outputs which are definable in the assetOpts object. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
  Param feeRate: Optional. Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
  Param sysFromXpubOrAddress: Optional. If wanting to fund from a specific XPUB or address specify this field should be set
  Param utxos: Optional. Pass in specific utxos to fund a transaction.
  Param redeemOrWitnessScript: Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
  Returns: PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
  */
  public assetAllocationBurn = async (
    assetOpts: any,
    txOpts: any,
    assetMap: any,
    sysChangeAddress: any,
    feeRate: any,
    sysFromXpubOrAddress: any,
    utxos: any,
    redeemOrWitnessScript: any
  ) => {
    if (this.Signer) {
      if (!sysChangeAddress) {
        sysChangeAddress = await this.Signer.getNewChangeAddress();
      }
      for (const valueAssetObj of assetMap.values()) {
        if (!valueAssetObj.changeAddress) {
          valueAssetObj.changeAddress = await this.Signer.getNewChangeAddress();
        }
      }
    }
    // true last param for filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
    utxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      sysFromXpubOrAddress,
      txOpts,
      assetMap,
      false
    );
    const res = syscointx.assetAllocationBurn(
      assetOpts,
      txOpts,
      utxos,
      assetMap,
      sysChangeAddress,
      feeRate
    );
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript);
    if (sysFromXpubOrAddress || !this.Signer) {
      return {
        psbt: psbt,
        res: psbt,
        assets: utils.getAssetsRequiringNotarization(psbt, utxos.assets),
      };
    }
    return await this.signAndSend(
      psbt,
      utils.getAssetsRequiringNotarization(psbt, utxos.assets),
      undefined,
      undefined
    );
  };

  /* assetAllocationMint
  Purpose: Minting new asset using proof-of-lock on Ethereum as a proof to mint tokens on Syscoin.
  Param assetOpts: Optional. If you have the Ethereum TXID and want to use eth-proof you can just specify the ethtxid and web3url fields. Fields described below:
    Field ethtxid. Required. The trasaction that calls freezeBurnERC20() on ERC20Manager contract
    Field web3url. Optional. If using eth-proof fully qualified Web3 HTTP-RPC URL that eth-proof needs to obtain the tx proof and receipt proof information needed by Syscoin to valdiate the mint
    Field blocknumber. Optional if ethtxid/web3url not provided. Block number of transaction including freezeBurnERC20() call
    Field txvalue. Optional if ethtxid/web3url not provided. Buffer value of the transaction hex encoded in RLP format
    Field txroot. Optional if ethtxid/web3url not provided. Buffer value of the transaction merkle root encoded in RLP format
    Field txparentnodes. Optional if ethtxid/web3url not provided. Buffer value of the transaction merkle proof encoded in RLP format
    Field txpath. Optional if ethtxid/web3url not provided. Buffer value of the merkle path for the transaction and receipt proof
    Field receiptvalue. Optional if ethtxid/web3url not provided. Buffer value of the transaction receipt hex encoded in RLP format
    Field receiptroot. Optional if ethtxid/web3url not provided. Buffer value of the receipt merkle root encoded in RLP format
    Field receiptparentnodes. Optional if ethtxid/web3url not provided. Buffer value of the receipt merkle proof encoded in RLP format
  Param txOpts: Optional. Transaction options. Fields are described below:
    Field rbf. Optional. True by default. Replace-by-fee functionality allowing one to bump transaction by increasing fee for UTXOs used.
    Field assetWhiteList. Optional. null by default. Allows UTXO's to be added from assets in the whitelist or the asset being sent
  Param assetMap: Optional. Auto-filled by eth-proof if it is used (pass ethtxid and web3url in assetOpts). Description of Map:
    Index assetGuid. Required. Numeric Asset GUID you are sending to
    Value is described below:
      Field changeAddress. Optional. Where asset change outputs will be sent to. If it is not there or null a new change address will be created. If Signer is not set, it will send asset change outputs to sysChangeAddress
      Field outputs. Required. Array of objects described below:
        Field value. Required. Big Number representing satoshi's to mint
    Example:
      const assetMap = new Map([
        [assetGuid, { outputs: [{ value: new BN(1000), address: 'tsys1qdflre2yd37qtpqe2ykuhwandlhq04r2td2t9ae' }] }]
      ])
      Would mint 1000 satoshi to address 'tsys1qdflre2yd37qtpqe2ykuhwandlhq04r2td2t9ae' in asset 'assetGuid'
  Param sysChangeAddress: Optional. Change address if defined is where Syscoin only change outputs are sent to. Does not apply to asset change outputs which are definable in the assetOpts object. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
  Param feeRate: Optional. Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
  Param sysFromXpubOrAddress: Optional. If wanting to fund from a specific XPUB or address specify this field should be set
  Param utxos: Optional. Pass in specific utxos to fund a transaction.
  Param redeemOrWitnessScript: Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
  Returns: PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
  */
  public assetAllocationMint = async (
    assetOpts: any,
    txOpts: any,
    assetMap: any,
    sysChangeAddress: any,
    feeRate: any,
    sysFromXpubOrAddress: any,
    utxos: any,
    redeemOrWitnessScript: any
  ) => {
    if (this.Signer) {
      if (assetMap) {
        for (const valueAssetObj of assetMap.values()) {
          if (!valueAssetObj.changeAddress) {
            valueAssetObj.changeAddress =
              await this.Signer.getNewChangeAddress();
          }
        }
      }
      if (!sysChangeAddress) {
        sysChangeAddress = await this.Signer.getNewChangeAddress();
      }
    }
    if (!assetMap) {
      const ethProof = await utils.buildEthProof(assetOpts);
      let changeAddress;
      if (this.Signer) {
        changeAddress = await this.Signer.getNewChangeAddress();
      }
      if (sysChangeAddress === changeAddress) {
        throw Object.assign(
          new Error(
            'Syscoin and asset change address cannot be the same for assetAllocationMint!'
          ),
          { code: 402 }
        );
      }
      assetMap = new Map([
        [
          ethProof.assetguid,
          {
            changeAddress: changeAddress,
            outputs: [
              { value: ethProof.amount, address: ethProof.destinationaddress },
            ],
          },
        ],
      ]);
      assetOpts = {
        ethtxid: Buffer.from(ethProof.ethtxid, 'hex'),
        blockhash: Buffer.from(ethProof.blockhash, 'hex'),
        txvalue: Buffer.from(ethProof.txvalue, 'hex'),
        txroot: Buffer.from(ethProof.txroot, 'hex'),
        txparentnodes: Buffer.from(ethProof.txparentnodes, 'hex'),
        txpath: Buffer.from(ethProof.txpath, 'hex'),
        receiptvalue: Buffer.from(ethProof.receiptvalue, 'hex'),
        receiptroot: Buffer.from(ethProof.receiptroot, 'hex'),
        receiptparentnodes: Buffer.from(ethProof.receiptparentnodes, 'hex'),
      };
    }

    // false last param for filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
    utxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      sysFromXpubOrAddress,
      txOpts,
      assetMap,
      false
    );
    const res = syscointx.assetAllocationMint(
      assetOpts,
      txOpts,
      utxos,
      assetMap,
      sysChangeAddress,
      feeRate
    );
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript);
    if (sysFromXpubOrAddress || !this.Signer) {
      return {
        psbt: psbt,
        res: psbt,
        assets: utils.getAssetsRequiringNotarization(psbt, utxos.assets),
      };
    }
    return await this.signAndSend(
      psbt,
      utils.getAssetsRequiringNotarization(psbt, utxos.assets),
      undefined,
      undefined
    );
  };

  /* syscoinBurnToAssetAllocation
  Purpose: Burn Syscoin to mint SYSX
  Param txOpts: Optional. Transaction options. Fields are described below:
    Field rbf. Optional. True by default. Replace-by-fee functionality allowing one to bump transaction by increasing fee for UTXOs used.
    Field assetWhiteList. Optional. null by default. Allows UTXO's to be added from assets in the whitelist or the asset being sent
  Param assetMap: Required. Description of Map:
    Index assetGuid. Required. Numeric Asset GUID you are sending to
    Value is described below:
      Field changeAddress. Optional. Where asset change outputs will be sent to. If it is not there or null a new change address will be created. If Signer is not set, it will send asset change outputs to sysChangeAddress
      Field outputs. Required. Array of objects described below:
        Field value. Required. Big Number representing satoshi's to mint
    Example:
      const assetMap = new Map([
        [assetGuid, { outputs: [{ value: new BN(1000), address: 'tsys1qdflre2yd37qtpqe2ykuhwandlhq04r2td2t9ae' }] }]
      ])
      Would mint 1000 satoshi to address 'tsys1qdflre2yd37qtpqe2ykuhwandlhq04r2td2t9ae' in asset 'assetGuid'.
      Would also end up burning 1000 SYS satoshi to OP_RETURN output
  Param sysChangeAddress: Optional. Change address if defined is where Syscoin only change outputs are sent to. Does not apply to asset change outputs which are definable in the assetOpts object. If not defined and Signer is defined then a new change address will be automatically created using the next available change address index in the HD path
  Param feeRate: Optional. Defaults to 10 satoshi per byte. How many satoshi per byte the network fee should be paid out as.
  Param sysFromXpubOrAddress: Optional. If wanting to fund from a specific XPUB or address specify this field should be set
  Param utxos: Optional. Pass in specific utxos to fund a transaction.
  Param redeemOrWitnessScript: Optional. redeemScript for P2SH and witnessScript for P2WSH spending conditions.
  Returns: PSBT if if Signer is set or result object which is used to create PSBT and sign/send if xpub/address are passed in to fund transaction
  */
  public syscoinBurnToAssetAllocation = async (
    txOpts: any,
    assetMap: any,
    sysChangeAddress: any,
    feeRate: any,
    sysFromXpubOrAddress: any,
    utxos: any,
    redeemOrWitnessScript: any
  ) => {
    if (this.Signer) {
      for (const valueAssetObj of assetMap.values()) {
        if (!valueAssetObj.changeAddress) {
          valueAssetObj.changeAddress = await this.Signer.getNewChangeAddress();
        }
      }
      if (!sysChangeAddress) {
        sysChangeAddress = await this.Signer.getNewChangeAddress();
      }
    }
    // false last param for filtering out 0 conf UTXO, new/update/send asset transactions must use confirmed inputs only as per Syscoin Core mempool policy
    utxos = await this.fetchAndSanitizeUTXOs(
      utxos,
      sysFromXpubOrAddress,
      txOpts,
      assetMap,
      false
    );
    const res = syscointx.syscoinBurnToAssetAllocation(
      txOpts,
      utxos,
      assetMap,
      sysChangeAddress,
      feeRate
    );
    const psbt = await this.createPSBTFromRes(res, redeemOrWitnessScript);
    if (sysFromXpubOrAddress || !this.Signer) {
      return {
        psbt: psbt,
        res: psbt,
        assets: utils.getAssetsRequiringNotarization(psbt, utxos.assets),
      };
    }
    return await this.signAndSend(
      psbt,
      utils.getAssetsRequiringNotarization(psbt, utxos.assets),
      undefined,
      undefined
    );
  };
}

const SyscoinJSLib = Syscoin;
const syscoin = Syscoin;

export { SyscoinJSLib, syscoin, utils };
