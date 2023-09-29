import axios from 'axios';
import coinSelectSyscoin from 'coinselectsyscoin';
import syscointx from 'syscointx-js';
import { BIP_84, ONE_HUNDRED_MILLION, SYSCOIN_BASIC_FEE } from 'utils';

import { SyscoinHDSigner } from '../signers';
import { TrezorKeyring } from '../trezor';
import {
  ISyscoinTransactions,
  KeyringAccountType,
  accountType,
} from '../types';
import { INetwork } from '@pollum-io/sysweb3-network';
import {
  sys,
  INewNFT,
  isBase64,
  repairBase64,
  ITokenSend,
  ITokenUpdate,
  ITxid,
  txUtils,
  getAsset,
  countDecimals,
} from '@pollum-io/sysweb3-utils';

type EstimateFeeParams = {
  outputs: { value: number; address: string }[];
  changeAddress: string;
  feeRateBN: any;
  xpub: string;
  explorerUrl: string;
};

export class SyscoinTransactions implements ISyscoinTransactions {
  //TODO: test and validate for general UTXO chains which will be the working methods, for now we just allow contentScripts for syscoin Chains
  private getNetwork: () => INetwork;
  private getSigner: () => {
    hd: SyscoinHDSigner;
    main: any;
  };
  private trezor: TrezorKeyring;
  private getState: () => {
    activeAccountId: number;
    accounts: {
      Trezor: accountType;
      Imported: accountType;
      HDAccount: accountType;
    };
    activeAccountType: KeyringAccountType;
    activeNetwork: INetwork;
  };
  private getAddress: (
    xpub: string,
    isChangeAddress: boolean,
    index: number
  ) => Promise<string>;
  constructor(
    getNetwork: () => INetwork,
    getSyscoinSigner: () => {
      hd: SyscoinHDSigner;
      main: any;
    },
    getState: () => {
      activeAccountId: number;
      accounts: {
        Trezor: accountType;
        Imported: accountType;
        HDAccount: accountType;
      };
      activeAccountType: KeyringAccountType;
      activeNetwork: INetwork;
    },
    getAddress: (
      xpub: string,
      isChangeAddress: boolean,
      index: number
    ) => Promise<string>
  ) {
    this.getNetwork = getNetwork;
    this.getSigner = getSyscoinSigner;
    this.getState = getState;
    this.getAddress = getAddress;
    this.trezor = new TrezorKeyring(this.getSigner);
  }

  public estimateSysTransactionFee = async ({
    outputs,
    changeAddress,
    feeRateBN,
    xpub,
    explorerUrl,
  }: EstimateFeeParams) => {
    const { hd } = this.getSigner();

    const txOpts = { rbf: true };

    const utxos = await sys.utils.fetchBackendUTXOS(
      explorerUrl,
      xpub,
      undefined
    );
    const utxosSanitized = sys.utils.sanitizeBlockbookUTXOs(
      null,
      utxos,
      hd.Signer.network,
      undefined,
      undefined,
      undefined
    );

    // 0 feerate to create tx, then find bytes and multiply feeRate by bytes to get estimated txfee
    const tx = await syscointx.createTransaction(
      txOpts,
      utxosSanitized,
      changeAddress,
      outputs,
      new sys.utils.BN(0)
    );
    const bytes = coinSelectSyscoin.utils.transactionBytes(
      tx.inputs,
      tx.outputs
    );
    const txFee = feeRateBN.mul(new sys.utils.BN(bytes));

    return txFee;
  };

  public getTransactionPSBT = async ({
    outputs,
    changeAddress,
    xpub,
    explorerUrl,
    feeRateBN,
  }: EstimateFeeParams) => {
    const { hd, main } = this.getSigner();

    const txOpts = { rbf: true };

    const utxos = await sys.utils.fetchBackendUTXOS(
      explorerUrl,
      xpub,
      undefined
    );
    const utxosSanitized = sys.utils.sanitizeBlockbookUTXOs(
      null,
      utxos,
      hd.Signer.network,
      undefined,
      undefined,
      undefined
    );

    const tx = await syscointx.createTransaction(
      txOpts,
      utxosSanitized,
      changeAddress,
      outputs,
      feeRateBN
    );

    const psbt = await main.createPSBTFromRes(tx);
    if (psbt) return psbt;
    throw new Error('psbt not found');
  };

  public getRecommendedFee = async (explorerUrl: string): Promise<number> => {
    return (
      (await sys.utils.fetchEstimateFee(explorerUrl, 1, undefined)) / 10 ** 8
    );
  };

  public txUtilsFunctions = () => {
    const { getFeeRate, getRawTransaction, getTokenMap } = txUtils();
    return {
      getFeeRate,
      getRawTransaction,
      getTokenMap,
    };
  };

  public createMintedToken = async ({
    txid,
    guid,
    initialSupply,
    precision,
    receivingAddress,
    fee,
  }: {
    txid: string;
    guid: string;
    initialSupply: number;
    precision: number;
    receivingAddress: string;
    fee: number;
  }) => {
    const network = this.getNetwork();

    const { hd, main } = this.getSigner();

    return await new Promise((resolve: any, reject: any) => {
      const interval = setInterval(async () => {
        const { getRawTransaction, getFeeRate, getTokenMap } =
          this.txUtilsFunctions();
        const createdTokenTransaction = await getRawTransaction(
          network.url,
          txid
        );

        if (
          createdTokenTransaction &&
          createdTokenTransaction.confirmations > 1
        ) {
          const changeAddress = await hd.getNewChangeAddress(true, 84);

          try {
            const tokenMap = getTokenMap({
              guid,
              changeAddress,
              amount: new sys.utils.BN(initialSupply * 10 ** precision) as any,
              receivingAddress,
            });
            const txOptions = { rbf: true };

            const pendingTransaction = await main.assetSend(
              txOptions,
              tokenMap,
              receivingAddress,
              getFeeRate(fee)
            );

            if (!pendingTransaction) {
              throw new Error(
                'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
              );
            }

            const txid = pendingTransaction.extractTransaction().getId();

            resolve({
              createdTokenTransaction,
              txid,
              confirmations: createdTokenTransaction.confirmations,
              guid,
            });
          } catch (error) {
            clearInterval(interval);

            reject(error);
          }
        }
      }, 16000);
    });
  };

  public transferAssetOwnership = async (transaction: any): Promise<ITxid> => {
    const { hd, main } = this.getSigner();
    const { fee, assetGuid, newOwner } = transaction;

    const feeRate = new sys.utils.BN(fee * 1e8);
    const txOpts = { rbf: true };
    const assetOpts = {};

    const assetMap = new Map([
      [
        assetGuid,
        {
          changeAddress: await hd.getNewChangeAddress(true, 84),
          outputs: [
            {
              value: new sys.utils.BN(0),
              address: newOwner,
            },
          ],
        },
      ],
    ]);

    const pendingTx = await main.assetUpdate(
      assetGuid,
      assetOpts,
      txOpts,
      assetMap,
      null,
      feeRate
    );

    if (!pendingTx) {
      console.error('Could not create transaction, not enough funds?');
    }

    const txid = pendingTx.extractTransaction().getId();

    return { txid };
  };

  // todo: create temp tx type new token
  public getTokenUpdateOptions = (temporaryTransaction: any) => {
    const { main } = this.getSigner();

    const {
      capabilityflags,
      contract,
      description,
      notarydetails,
      auxfeedetails,
      notaryAddress,
      payoutAddress,
    } = temporaryTransaction;

    let tokenOptions = {
      description,
      updatecapabilityflags: capabilityflags ? String(capabilityflags) : '127',
      notarydetails,
      auxfeedetails,
      notarykeyid: Buffer.from('', 'hex'),
      contract: contract ? Buffer.from(contract, 'hex') : null,
    };

    if (notaryAddress) {
      const notaryPayment = sys.utils.bitcoinjs.payments.p2wpkh({
        address: notaryAddress,
        network: main.network,
      }) as any;

      tokenOptions = {
        ...tokenOptions,
        notarydetails: {
          ...notarydetails,
          endpoint: Buffer.from(
            syscointx.utils.encodeToBase64(notarydetails.endpoint)
          ),
        },
        notarykeyid: Buffer.from(notaryPayment.hash.toString('hex'), 'hex'),
      };
    }

    if (payoutAddress) {
      const payment = sys.utils.bitcoinjs.payments.p2wpkh({
        address: payoutAddress,
        network: main.network,
      }) as any;

      const auxFeeKeyID = Buffer.from(payment.hash.toString('hex'), 'hex');

      tokenOptions = {
        ...tokenOptions,
        auxfeedetails: {
          ...tokenOptions.auxfeedetails,
          auxfeekeyid: auxFeeKeyID,
        },
      };
    }

    return tokenOptions;
  };

  // todo: create temp tx type new token
  public getTokenCreationOptions = (temporaryTransaction: any) => {
    const { main } = this.getSigner();

    const {
      capabilityflags,
      notarydetails,
      auxfeedetails,
      precision,
      symbol,
      description,
      maxsupply,
      notaryAddress,
      payoutAddress,
    } = temporaryTransaction;

    const newMaxSupply = maxsupply * 10 ** precision;

    let tokenOptions = {
      precision,
      symbol,
      description,
      maxsupply: new sys.utils.BN(newMaxSupply),
      updatecapabilityflags: capabilityflags ? String(capabilityflags) : '127',
      notarydetails,
      auxfeedetails,
      notarykeyid: Buffer.from('', 'hex'),
    };

    if (notaryAddress) {
      const notaryPayment = sys.utils.bitcoinjs.payments.p2wpkh({
        address: notaryAddress,
        network: main.network,
      }) as any;

      tokenOptions = {
        ...tokenOptions,
        notarydetails: {
          ...notarydetails,
          endpoint: Buffer.from(
            syscointx.utils.encodeToBase64(notarydetails.endpoint)
          ),
        },
        notarykeyid: Buffer.from(notaryPayment.hash.toString('hex'), 'hex'),
      };
    }

    if (payoutAddress) {
      const payment = sys.utils.bitcoinjs.payments.p2wpkh({
        address: payoutAddress,
        network: main.network,
      }) as any;

      const auxFeeKeyID = Buffer.from(payment.hash.toString('hex'), 'hex');

      tokenOptions = {
        ...tokenOptions,
        auxfeedetails: {
          ...tokenOptions.auxfeedetails,
          auxfeekeyid: auxFeeKeyID,
        },
      };
    }

    return tokenOptions;
  };
  confirmTokenCreation = async (
    // todo: type
    temporaryTransaction: any
  ): Promise<{
    transactionData: any;
    txid: string;
    confirmations: number;
    guid: string;
  }> => {
    const { hd, main } = this.getSigner();
    const { getRawTransaction } = this.txUtilsFunctions();

    const { precision, initialSupply, maxsupply, fee, receiver } =
      temporaryTransaction;

    const amount = maxsupply * 10 ** precision;

    const tokenOptions = this.getTokenCreationOptions(temporaryTransaction);
    const txOptions = { rbf: true };

    const newChangeAddress = await hd.getNewChangeAddress(true, 84);
    const newFee = new sys.utils.BN(fee * 1e8);

    const pendingTransaction = await main.assetNew(
      tokenOptions,
      txOptions,
      newChangeAddress,
      receiver,
      newFee
    );

    const txid = pendingTransaction.extractTransaction().getId();
    const transactionData = await getRawTransaction(main.blockbookURL, txid);
    const assets = syscointx.getAssetsFromTx(
      pendingTransaction.extractTransaction()
    );
    const createdTokenGuid = assets.keys().next().value;

    if (initialSupply && initialSupply < amount) {
      this.createMintedToken({
        txid,
        guid: createdTokenGuid,
        initialSupply,
        precision,
        receivingAddress: receiver,
        fee,
      });
    }

    return {
      transactionData,
      txid,
      confirmations: transactionData.confirmations,
      guid: createdTokenGuid,
    };
  };

  public confirmTokenMint = async (temporaryTransaction: any): Promise<any> => {
    const { getTokenMap } = this.txUtilsFunctions();
    const { main } = this.getSigner();

    const { fee, assetGuid, amount, receivingAddress } = temporaryTransaction;

    const feeRate = new sys.utils.BN(fee * 1e8);

    const token = await getAsset(main.blockbookURL, assetGuid);

    if (!token)
      throw new Error(
        'Bad Request: Could not create transaction. Token not found.'
      );

    const txOptions = { rbf: true };

    const tokenMap = getTokenMap({
      guid: assetGuid,
      changeAddress: '',
      amount: new sys.utils.BN(amount * 10 ** token.decimals) as any,
      receivingAddress,
    });

    try {
      const pendingTransaction = await main.assetSend(
        txOptions,
        tokenMap,
        null,
        feeRate
      );

      if (!pendingTransaction) {
        throw new Error(
          'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
        );
      }

      const txid = pendingTransaction.extractTransaction().getId();

      return { txid };
    } catch (error) {
      throw new Error('Bad Request: Could not create transaction.');
    }
  };

  public createParentToken = async ({
    tokenOptions,
    feeRate,
  }: {
    tokenOptions: {
      precision: number;
      symbol: string;
      maxsupply: number;
      description: string;
    };
    feeRate: number;
  }) => {
    const { hd, main } = this.getSigner();

    const tokenChangeAddress = await hd.getNewChangeAddress(true, 84);
    const txOptions = { rbf: true };

    const pendingTransaction = await main.assetNew(
      tokenOptions,
      txOptions,
      tokenChangeAddress,
      tokenChangeAddress,
      feeRate
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const tokensFromTransaction = syscointx.getAssetsFromTx(
      pendingTransaction.extractTransaction()
    );
    const txid = pendingTransaction.extractTransaction().getId();

    return {
      guid: tokensFromTransaction.keys().next().value,
      txid,
    };
  };

  public nftCreationStep3 = async (
    tx: INewNFT,
    guid: string
  ): Promise<ITxid> => {
    const { main } = this.getSigner();
    const { getRawTransaction, getTokenMap } = this.txUtilsFunctions();

    const { receivingAddress } = tx;

    const feeRate = new sys.utils.BN(10);
    const tokenOptions = { updatecapabilityflags: '0' };
    const txOptions = { rbf: true };

    const tokenMap = getTokenMap({
      guid,
      changeAddress: '',
      amount: new sys.utils.BN(0) as any,
      receivingAddress,
    });

    const pendingTransaction = await main.assetUpdate(
      guid,
      tokenOptions,
      txOptions,
      tokenMap,
      receivingAddress,
      feeRate
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not update minted token. Invalid or incorrect data provided.'
      );
    }

    const txid = pendingTransaction.extractTransaction().getId();

    return await new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const updateTx = await getRawTransaction(main.blockbookURL, txid);

          if (updateTx.confirmations <= 0) return;

          clearInterval(interval);

          return resolve({ txid });
        } catch (error) {
          reject(error);
        }
      }, 16000);
    });
  };

  public nftCreationStep2 = async (
    tx: INewNFT,
    guid: string
  ): Promise<ITxid> => {
    const { main } = this.getSigner();
    const { getRawTransaction, getTokenMap } = this.txUtilsFunctions();

    const { receivingAddress, precision, fee } = tx;

    const feeRate = new sys.utils.BN(fee * 1e8);

    const tokenMap = getTokenMap({
      guid,
      changeAddress: '',
      amount: new sys.utils.BN(1 * 10 ** precision) as any,
      receivingAddress,
    });

    const txOptions = { rbf: true };
    const pendingTransaction = await main.assetSend(
      txOptions,
      tokenMap,
      null,
      feeRate
    );

    if (!pendingTransaction) {
      throw new Error(
        `Bad Request: Could not mint token ${guid}. Invalid or incorrect data provided.`
      );
    }

    const txid = pendingTransaction.extractTransaction().getId();

    return await new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const mintTx = await getRawTransaction(main.blockbookURL, txid);

          if (mintTx.confirmations <= 0) return;

          clearInterval(interval);

          return resolve({ txid });
        } catch (error) {
          reject(error);
        }
      }, 16000);
    });
  };

  public nftCreationStep1 = async (
    tx: INewNFT
  ): Promise<{ parent: { guid: string; txid: string } }> => {
    const { main } = this.getSigner();
    const { getRawTransaction } = this.txUtilsFunctions();

    const { fee, symbol, description, precision } = tx;

    const feeRate = new sys.utils.BN(fee * 1e8) as any;

    const tokenOptions = {
      precision,
      symbol,
      maxsupply: new sys.utils.BN(1 * 10 ** precision),
      description,
    } as any;

    const parentToken = await this.createParentToken({ tokenOptions, feeRate });

    return await new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const creationTx = await getRawTransaction(
            main.blockbookURL,
            parentToken.txid
          );

          if (creationTx.confirmations <= 0) return;

          clearInterval(interval);

          return resolve({ parent: parentToken });
        } catch (error) {
          reject(error);
        }
      }, 16000);
    });
  };

  confirmNftCreation = (tx: any) => {
    if (tx) {
      // create token
      this.nftCreationStep1(tx).then((createRes) => {
        const {
          parent: { guid },
        } = createRes;
        // mint token
        this.nftCreationStep2(tx, guid).then(() => {
          // update token
          this.nftCreationStep3(tx, guid);
        });
      });
      return { success: true };
    }
    return { success: false };
  };

  public signPSBT = async ({
    psbt,
    signer,
  }: {
    psbt: string;
    signer: any;
  }): Promise<JSON> => {
    return sys.utils.exportPsbtToJson(
      await signer.sign(psbt),
      undefined
    ) as any;
  };

  public signAndSendPsbt = async ({
    psbt,
    notaryAssets,
  }: {
    psbt: string;
    notaryAssets: any;
  }): Promise<JSON> => {
    const { main } = this.getSigner();
    if (notaryAssets.size === 0) {
      return sys.utils.exportPsbtToJson(
        await main.signAndSend(psbt),
        undefined
      ) as any;
    } else {
      return sys.utils.exportPsbtToJson(
        await main.signAndSend(psbt, notaryAssets),
        undefined
      ) as any;
    }
  };

  signTransaction = async (
    data: { psbt: string; assets: string },
    isSignOnly: boolean
  ): Promise<any> => {
    const { hd } = this.getSigner();

    if (!isBase64(data.psbt)) {
      //Trying to recover from a bad base64 string, replacing spaces with + which happens by lack of encodeURI usage
      data.psbt = repairBase64(data.psbt);
    }

    if (!isBase64(data.psbt) || typeof data.assets !== 'string') {
      throw new Error(
        'Bad Request: PSBT must be in Base64 format and assets must be a JSON string. Please check the documentation to see the correct formats.'
      );
    }

    try {
      const response = sys.utils.importPsbtFromJson(data, undefined) as any;

      if (isSignOnly) {
        return await this.signPSBT({
          psbt: response.psbt,
          signer: hd,
        });
      }

      return await this.signAndSendPsbt({
        psbt: response.psbt,
        notaryAssets: response.assets,
      });
    } catch (error) {
      throw new Error(
        String('Bad Request: Could not create transaction. ' + error)
      );
    }
  };

  public confirmUpdateToken = async (
    temporaryTransaction: ITokenUpdate
  ): Promise<ITxid> => {
    const { hd, main } = this.getSigner(); //TODO: remove hd as its defined inside main
    const { getTokenMap } = this.txUtilsFunctions();

    const { fee, assetGuid, assetWhiteList } = temporaryTransaction;

    const txOptions = { rbf: true, assetWhiteList };

    try {
      const tokenMap = getTokenMap({
        guid: assetGuid,
        changeAddress: await hd.getNewChangeAddress(true, 84),
        amount: new sys.utils.BN(0) as any,
        receivingAddress: await hd.getNewReceivingAddress(true, 84),
      });

      const tokenOptions = this.getTokenUpdateOptions(temporaryTransaction);

      const pendingTransaction = await main.assetUpdate(
        assetGuid,
        tokenOptions,
        txOptions,
        tokenMap,
        null,
        new sys.utils.BN(fee * 1e8)
      );

      const txid = pendingTransaction.extractTransaction().getId();

      if (!pendingTransaction || !txid) {
        throw new Error(
          'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
        );
      }

      return { txid };
    } catch (error) {
      throw new Error('Bad Request: Could not create transaction.');
    }
  };

  public confirmCustomTokenSend = async (
    temporaryTransaction: ITokenSend
  ): Promise<ITxid> => {
    const { main } = this.getSigner();
    const { getTokenMap } = this.txUtilsFunctions();

    const { amount, rbf, receivingAddress, fee, token } = temporaryTransaction;
    const { guid } = token;
    const asset = await getAsset(main.blockbookURL, guid);

    if (!asset)
      throw new Error(
        'Bad Request: Could not create transaction. Token not found.'
      );

    const txOptions = { rbf };
    const value = new sys.utils.BN(amount * 10 ** 8);
    const valueDecimals = countDecimals(amount);
    const feeRate = new sys.utils.BN(fee * 1e8);

    const { decimals } = asset;

    if (valueDecimals > decimals) {
      throw new Error(
        `This token has ${decimals} decimals and you are trying to send a value with ${decimals} decimals, please check your tx`
      );
    }

    try {
      const tokenOptions = getTokenMap({
        guid,
        changeAddress: '',
        amount: value as any,
        receivingAddress,
      });

      const pendingTransaction = await main.assetAllocationSend(
        txOptions,
        tokenOptions,
        null,
        feeRate
      );

      const txid = pendingTransaction.extractTransaction().getId();

      return { txid };
    } catch (error) {
      throw new Error('Bad Request: Could not create transaction.');
    }
  };

  public async sendRawTransaction(txHex: string, xpub: string, psbt: any) {
    const { main } = this.getSigner();
    const axiosConfig = {
      headers: {
        'X-User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
      },
      withCredentials: true,
    };
    try {
      let blockbookURL = main.blockbookURL.slice();
      if (blockbookURL) {
        blockbookURL = blockbookURL.replace(/\/$/, '');
      }
      // eslint-disable-next-line no-undef
      if (fetch) {
        const requestOptions = {
          method: 'POST',
          body: txHex,
        };
        // eslint-disable-next-line no-undef
        const response = await fetch(
          blockbookURL + '/api/v2/sendtx/',
          requestOptions
        );

        if (response.ok) {
          const data = await response.json();

          await sys.utils.fetchBackendAccount(
            blockbookURL,
            xpub,
            'tokens=used&details=tokens',
            true,
            undefined
          );

          return data;
        }
      } else {
        const request = await axios.post(
          blockbookURL + '/api/v2/sendtx/',
          txHex,
          axiosConfig
        );
        if (request && request.data) {
          await sys.utils.fetchBackendAccount(
            blockbookURL,
            xpub,
            'tokens=used&details=tokens',
            true,
            undefined
          );
          console.log(
            'tx send successfully',
            psbt.extractTransaction().getId()
          );
          return psbt;
        }
      }
      return null;
    } catch (e) {
      return e;
    }
  }

  public getEstimateSysTransactionFee = async ({
    amount,
    receivingAddress,
  }: {
    amount: number;
    receivingAddress: string;
  }) => {
    const { hd, main } = this.getSigner();
    const value = new sys.utils.BN(amount * ONE_HUNDRED_MILLION);
    const feeRate = new sys.utils.BN(SYSCOIN_BASIC_FEE * ONE_HUNDRED_MILLION);
    const xpub = hd.getAccountXpub();
    const outputs = [
      {
        address: receivingAddress,
        value,
      },
    ] as any;

    const changeAddress = await hd.getNewChangeAddress(true, BIP_84);

    try {
      const txFee = await this.estimateSysTransactionFee({
        outputs,
        changeAddress,
        feeRateBN: feeRate,
        xpub,
        explorerUrl: main.blockbookURL,
      });

      return +`${txFee.toNumber() / ONE_HUNDRED_MILLION}`;
    } catch (error) {
      console.log(error);
      return SYSCOIN_BASIC_FEE;
    }
  };

  public confirmNativeTokenSend = async (
    temporaryTransaction: ITokenSend,
    isTrezor?: boolean
  ): Promise<ITxid> => {
    const { hd, main } = this.getSigner();

    const { receivingAddress, amount, fee } = temporaryTransaction;

    if (isTrezor) {
      try {
        const { activeAccountId, accounts, activeAccountType, activeNetwork } =
          this.getState();
        const coin =
          activeNetwork.currency && activeNetwork.currency.toLocaleLowerCase();
        const {
          xpub,
          balances: { syscoin },
        }: any = accounts[activeAccountType][activeAccountId];

        const feeRate = new sys.utils.BN(fee * 1e8);

        const value = new sys.utils.BN(amount * 1e8);

        let outputs = [
          {
            address: receivingAddress,
            value,
          },
        ] as any;

        const changeAddress = await this.getAddress(
          xpub,
          true,
          activeAccountId
        );

        const txFee = await this.estimateSysTransactionFee({
          outputs,
          changeAddress: `${changeAddress}`,
          feeRateBN: feeRate,
          xpub,
          explorerUrl: main.blockbookURL,
        });

        if (value.add(txFee).gte(syscoin)) {
          outputs = [
            {
              address: receivingAddress,
              value: value,
            },
          ];
        }

        const psbt = await this.getTransactionPSBT({
          outputs,
          changeAddress: `${changeAddress}`,
          feeRateBN: feeRate,
          xpub,
          explorerUrl: main.blockbookURL,
        });

        const trezorTx = this.trezor.convertToTrezorFormat({
          psbt,
          coin: `${coin ? coin : 'sys'}`,
        });
        const response = await this.trezor.signUtxoTransaction(trezorTx, psbt);
        const tx = await this.sendRawTransaction(
          response.extractTransaction().toHex(),
          xpub,
          response
        );
        if (tx.result) {
          return { txid: tx.result };
        }
        const txid = tx.extractTransaction().getId();
        return { txid };
      } catch (error) {
        throw new Error(
          `Bad Request: Could not create transaction. Error: ${error}`
        );
      }
    }

    const feeRate = new sys.utils.BN(fee * 1e8);

    const xpub = hd.getAccountXpub();

    const backendAccount = await sys.utils.fetchBackendAccount(
      main.blockbookURL,
      xpub,
      {},
      true,
      undefined
    );

    const value = new sys.utils.BN(amount * 1e8);

    let outputs = [
      {
        address: receivingAddress,
        value,
      },
    ] as any;

    const changeAddress = await hd.getNewChangeAddress(true, 84);

    const txOptions = { rbf: true };

    try {
      const txFee = await this.estimateSysTransactionFee({
        outputs,
        changeAddress,
        feeRateBN: feeRate,
        xpub,
        explorerUrl: main.blockbookURL,
      });

      if (value.add(txFee).gte(backendAccount.balance)) {
        outputs = [
          {
            address: receivingAddress,
            value: value,
          },
        ];
      }

      const pendingTransaction = await main.createTransaction(
        txOptions,
        changeAddress,
        outputs,
        feeRate
      );

      const txid = pendingTransaction.extractTransaction().getId();

      return { txid };
    } catch (error) {
      throw new Error(
        `Bad Request: Could not create transaction. Error: ${error}`
      );
    }
  };

  public sendTransaction = async (
    temporaryTransaction: ITokenSend,
    isTrezor?: boolean
  ): Promise<ITxid> => {
    const { isToken, token } = temporaryTransaction;

    if (isToken && token) {
      return await this.confirmCustomTokenSend(temporaryTransaction);
    }

    return await this.confirmNativeTokenSend(temporaryTransaction, isTrezor);
  };
}
