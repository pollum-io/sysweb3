import coinSelectSyscoin from 'coinselectsyscoin';
import sys from 'syscoinjs-lib';
import syscointx from 'syscointx-js';

import { ISyscoinTransactions } from '../types';
import {
  INewNFT,
  isBase64,
  ITokenMint,
  ITokenSend,
  ITokenUpdate,
  ITxid,
  txUtils,
  getSigners,
  getAsset,
  countDecimals,
  getDecryptedVault,
} from '@pollum-io/sysweb3-utils';

type EstimateFeeParams = {
  outputs: { value: number; address: string }[];
  changeAddress: string;
  feeRateBN: any;
  xpub: string;
  explorerUrl: string;
};

export const SyscoinTransactions = (): ISyscoinTransactions => {
  const estimateSysTransactionFee = async ({
    outputs,
    changeAddress,
    feeRateBN,
    xpub,
    explorerUrl,
  }: EstimateFeeParams) => {
    const { _hd } = getSigners();

    const txOpts = { rbf: true };

    const utxos = await sys.utils.fetchBackendUTXOS(explorerUrl, xpub);
    const utxosSanitized = sys.utils.sanitizeBlockbookUTXOs(
      null,
      utxos,
      _hd.Signer.network
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

  const { getFeeRate, getRawTransaction, getTokenMap } = txUtils();

  const _createMintedToken = async ({
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
    const { network } = getDecryptedVault();

    const { _hd, _main } = getSigners();

    return await new Promise((resolve: any, reject: any) => {
      const interval = setInterval(async () => {
        const createdTokenTransaction = await getRawTransaction(
          network.url,
          txid
        );

        if (
          createdTokenTransaction &&
          createdTokenTransaction.confirmations > 1
        ) {
          const changeAddress = await _hd.getNewChangeAddress(true);

          try {
            const tokenMap = getTokenMap({
              guid,
              changeAddress,
              amount: new sys.utils.BN(initialSupply * 10 ** precision),
              receivingAddress,
            });
            const txOptions = { rbf: true };

            const pendingTransaction = await _main.assetSend(
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

  // todo: create temp tx type new token
  const _getTokenUpdateOptions = (temporaryTransaction: any) => {
    const { _main } = getSigners();

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
        network: _main.network,
      });

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
        network: _main.network,
      });

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
  const _getTokenCreationOptions = (temporaryTransaction: any) => {
    const { _main } = getSigners();

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
        network: _main.network,
      });

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
        network: _main.network,
      });

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

  const confirmTokenCreation = async (
    temporaryTransaction: any
  ): Promise<{
    transactionData: any;
    txid: string;
    confirmations: number;
    guid: string;
    json: any;
  }> => {
    const { _hd, _main } = getSigners();

    const { precision, initialSupply, maxsupply, fee, receiver } =
      temporaryTransaction;

    const amount = maxsupply * 10 ** precision;

    const tokenOptions = _getTokenCreationOptions(temporaryTransaction);
    const txOptions = { rbf: true };

    const pendingTransaction = await _main.assetNew(
      tokenOptions,
      txOptions,
      await _hd.getNewChangeAddress(true),
      receiver,
      new sys.utils.BN(fee * 1e8)
    );

    const txid = pendingTransaction.extractTransaction().getId();

    const transactionData = await getRawTransaction(_main.blockbookURL, txid);
    const assets = syscointx.getAssetsFromTx(
      pendingTransaction.extractTransaction()
    );
    const createdTokenGuid = assets.keys().next().value;

    if (initialSupply && initialSupply < amount) {
      _createMintedToken({
        txid,
        guid: createdTokenGuid,
        initialSupply,
        precision,
        receivingAddress: receiver,
        fee,
      });
    }

    const json = sys.utils.exportPsbtToJson(pendingTransaction, null);

    return {
      transactionData,
      txid,
      confirmations: transactionData.confirmations,
      guid: createdTokenGuid,
      json,
    };
  };

  const confirmTokenMint = async (
    temporaryTransaction: ITokenMint
  ): Promise<ITxid> => {
    const { _hd, _main } = getSigners();

    const { fee, assetGuid, amount } = temporaryTransaction;

    const feeRate = new sys.utils.BN(fee * 1e8);

    const { decimals } = await getAsset(_main.blockbookURL, assetGuid);

    const receivingAddress = await _hd.getNewReceivingAddress(true);
    const txOptions = { rbf: true };

    const tokenMap = getTokenMap({
      guid: assetGuid,
      changeAddress: await _hd.getNewChangeAddress(true),
      amount: new sys.utils.BN(amount * 10 ** decimals),
      receivingAddress,
    });

    const pendingTransaction = await _main.assetSend(
      txOptions,
      tokenMap,
      await _hd.getNewChangeAddress(true),
      feeRate
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const txid = pendingTransaction.extractTransaction().getId();

    return { txid };
  };

  const _createParentToken = async ({
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
    const { _hd, _main } = getSigners();

    const tokenChangeAddress = await _hd.getNewChangeAddress(true);
    const txOptions = { rbf: true };

    const pendingTransaction = await _main.assetNew(
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

  const _mintParentToken = async ({
    parentTokenTransaction,
    parentToken,
    precision,
    receivingAddress,
    feeRate,
  }: {
    parentTokenTransaction: any;
    parentToken: any;
    precision: number;
    receivingAddress: string;
    feeRate: number;
  }) => {
    const { _main } = getSigners();

    if (parentTokenTransaction.confirmations >= 1) {
      const tokenMap = getTokenMap({
        guid: parentToken.guid,
        changeAddress: '',
        amount: new sys.utils.BN(1 * 10 ** precision),
        receivingAddress,
      });

      try {
        const txOptions = { rbf: true };
        const pendingTransaction = await _main.assetSend(
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

        return txid;
      } catch (error: any) {
        throw new Error(error);
      }
    }
  };

  const _updateParentToken = async ({
    parentToken,
    receivingAddress,
  }: {
    parentToken: any;
    receivingAddress: string;
  }) => {
    const { _main } = getSigners();

    const feeRate = new sys.utils.BN(10);
    const guid = parentToken.guid;
    const tokenOptions = { updatecapabilityflags: '0' };
    const txOptions = { rbf: true };

    const tokenMap = getTokenMap({
      guid,
      changeAddress: '',
      amount: new sys.utils.BN(0),
      receivingAddress,
    });

    const txid = await _main.assetUpdate(
      guid,
      tokenOptions,
      txOptions,
      tokenMap,
      receivingAddress,
      feeRate
    );

    if (!txid) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    return txid;
  };

  const confirmNftCreation = async (
    temporaryTransaction: INewNFT
  ): Promise<ITxid> => {
    const { network } = getDecryptedVault();

    const { fee, symbol, description, receivingAddress, precision } =
      temporaryTransaction;

    const feeRate = new sys.utils.BN(fee * 1e8);

    const tokenOptions = {
      precision,
      symbol,
      maxsupply: new sys.utils.BN(1 * 10 ** precision),
      description,
    };

    const parentToken = await _createParentToken({ tokenOptions, feeRate });

    if (parentToken.guid) {
      try {
        return await new Promise((resolve) => {
          const interval = setInterval(async () => {
            const parentTokenTransaction = await getRawTransaction(
              network.url,
              parentToken.txid
            );

            const txid = await _mintParentToken({
              parentTokenTransaction,
              parentToken,
              precision,
              receivingAddress,
              feeRate,
            });

            const parentTokenMintTransaction = await getRawTransaction(
              network.url,
              txid
            );

            if (!parentTokenMintTransaction) {
              throw new Error(
                'Bad Request: Transaction not indexed on explorer yet.'
              );
            }

            if (parentTokenMintTransaction.confirmations > 1) {
              const pendingTransaction = await _updateParentToken({
                parentToken,
                receivingAddress,
              });

              clearInterval(interval);

              resolve({
                txid: pendingTransaction.extractTransaction().getId(),
              });
            }

            return { txid: '' };
          }, 16000);
        });
      } catch (error) {
        throw new Error('Bad Request: Could not create transaction.');
      }
    }

    throw new Error('Bad Request: Could not create transaction.');
  };

  const _sendSignedPsbt = async ({
    psbt,
    signer,
  }: {
    psbt: string;
    signer: any;
  }): Promise<JSON> => {
    return sys.utils.exportPsbtToJson(await signer.sign(psbt));
  };

  const _signAndSendPsbt = async ({
    psbt,
    assets,
    signer,
  }: {
    psbt: string;
    assets: string;
    signer: any;
  }): Promise<JSON> => {
    return sys.utils.exportPsbtToJson(
      await signer.signAndSend(psbt, assets, signer)
    );
  };

  const signTransaction = async (
    data: { psbt: string; assets: string },
    isSendOnly: boolean,
    isTrezor?: boolean
  ): Promise<any> => {
    const { _main } = getSigners();

    if (!isBase64(data.psbt) || typeof data.assets !== 'string') {
      throw new Error(
        'Bad Request: PSBT must be in Base64 format and assets must be a JSON string. Please check the documentation to see the correct formats.'
      );
    }

    try {
      const response = sys.utils.importPsbtFromJson(data);

      const trezorSigner = new sys.utils.TrezorSigner();

      new sys.SyscoinJSLib(trezorSigner, _main.blockbookURL);

      if (isSendOnly) {
        return await _sendSignedPsbt({
          psbt: response.psbt,
          signer: isTrezor ? trezorSigner : _main,
        });
      }

      return await _signAndSendPsbt({
        psbt: response.psbt,
        assets: response.assets,
        signer: isTrezor ? trezorSigner : null,
      });
    } catch (error) {
      throw new Error('Bad Request: Could not create transaction.');
    }
  };

  const confirmUpdateToken = async (
    temporaryTransaction: ITokenUpdate
  ): Promise<ITxid> => {
    const { _hd, _main } = getSigners();

    const { fee, assetGuid, assetWhiteList } = temporaryTransaction;

    const txOptions = { rbf: true, assetWhiteList };

    try {
      const tokenMap = getTokenMap({
        guid: assetGuid,
        changeAddress: await _hd.getNewChangeAddress(true),
        amount: new sys.utils.BN(0),
        receivingAddress: await _hd.getNewReceivingAddress(true),
      });

      const tokenOptions = _getTokenUpdateOptions(temporaryTransaction);

      const pendingTransaction = await _main.assetUpdate(
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

  const _confirmCustomTokenSend = async (
    temporaryTransaction: ITokenSend
  ): Promise<ITxid> => {
    const { _main } = getSigners();

    const { amount, rbf, receivingAddress, fee, token } = temporaryTransaction;
    const { decimals } = await getAsset(_main.blockbookURL, token);

    const txOptions = { rbf };
    const value = new sys.utils.BN(amount * 10 ** decimals);
    const valueDecimals = countDecimals(amount);
    const feeRate = new sys.utils.BN(fee * 1e8);

    if (valueDecimals > decimals) {
      throw new Error(
        `This token has ${decimals} decimals and you are trying to send a value with ${decimals} decimals, please check your tx`
      );
    }

    try {
      const tokenOptions = getTokenMap({
        guid: token,
        changeAddress: '',
        amount: value,
        receivingAddress,
      });

      const pendingTransaction = await _main.assetAllocationSend(
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

  const _confirmNativeTokenSend = async (
    temporaryTransaction: ITokenSend
  ): Promise<ITxid> => {
    const { _hd, _main } = getSigners();

    const { receivingAddress, amount, fee } = temporaryTransaction;

    const feeRate = new sys.utils.BN(fee * 1e8);

    const xpub = _hd.getAccountXpub();

    const backendAccount = await sys.utils.fetchBackendAccount(
      _main.blockbookURL,
      xpub,
      {},
      true
    );

    const value = new sys.utils.BN(amount * 1e8);

    let outputs = [
      {
        address: receivingAddress,
        value,
      },
    ];

    const changeAddress = await _hd.getNewChangeAddress(true);

    const txOptions = { rbf: true };

    const txFee = await estimateSysTransactionFee({
      outputs,
      changeAddress,
      feeRateBN: feeRate,
      xpub,
      explorerUrl: _main.blockbookURL,
    });

    if (value.add(txFee).gte(backendAccount.balance)) {
      outputs = [
        {
          address: receivingAddress,
          value: value.sub(txFee),
        },
      ];
    }

    try {
      const pendingTransaction = await _main.createTransaction(
        txOptions,
        changeAddress,
        outputs,
        feeRate
      );

      const txid = pendingTransaction.extractTransaction().getId();

      return { txid };
    } catch (error) {
      throw new Error('Bad Request: Could not create transaction.');
    }
  };

  const sendTransaction = async (
    temporaryTransaction: ITokenSend
  ): Promise<ITxid> => {
    const { isToken, token } = temporaryTransaction;

    if (isToken && token) {
      return await _confirmCustomTokenSend(temporaryTransaction);
    }

    return await _confirmNativeTokenSend(temporaryTransaction);
  };

  const confirmMintNFT = async (
    temporaryTransaction: ITokenMint
  ): Promise<ITxid> => {
    const { _hd, _main } = getSigners();

    const { fee, amount, assetGuid }: ITokenMint = temporaryTransaction;
    const { blockbookURL } = _main;

    const { decimals } = await getAsset(blockbookURL, assetGuid);
    const feeRate = new sys.utils.BN(fee * 1e8);
    const txOptions = { rbf: true };

    const tokenMap = getTokenMap({
      guid: assetGuid,
      changeAddress: await _hd.getNewChangeAddress(true),
      amount: new sys.utils.BN(amount * 10 ** decimals),
      receivingAddress: await _hd.getNewReceivingAddress(true),
    });

    try {
      const pendingTransaction = await _main.assetSend(
        txOptions,
        tokenMap,
        await _hd.getNewChangeAddress(true),
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
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }
  };

  return {
    confirmMintNFT,
    confirmNftCreation,
    confirmTokenMint,
    confirmTokenCreation,
    confirmUpdateToken,
    sendTransaction,
    signTransaction,
  };
};
