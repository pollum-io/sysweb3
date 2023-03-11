import sys from 'syscoinjs-lib';

import { getSigners } from '../signers';
import { ITokenMap, ITxid } from '@pollum-io/sysweb3-utils/src'; // TODO: Temp package src

export const TrezorTransactions = () => {
  const confirmTokenMint = async ({
    tokenOptions,
    feeRate,
  }: {
    tokenOptions: ITokenMap;
    feeRate: number;
  }): Promise<ITxid> => {
    const { _hd, _main } = getSigners();

    const pendingTransaction = await _main.assetSend(
      { rbf: true },
      tokenOptions,
      _hd.getNewChangeAddress(true),
      feeRate,
      _hd.getAccountXpub()
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const trezorSigner = new sys.utils.TrezorSigner();

    new sys.SyscoinJSLib(trezorSigner, _main.blockbookURL);

    try {
      const txid = await _main.signAndSend(
        pendingTransaction.psbt,
        pendingTransaction.assets,
        trezorSigner
      );

      return { txid };
    } catch (error: any) {
      throw new Error(error);
    }
  };

  const confirmTokenSend = async ({
    txOptions,
    tokenOptions,
    feeRate,
  }: {
    txOptions: { rbf?: boolean };
    tokenOptions: ITokenMap;
    feeRate: number;
  }): Promise<ITxid> => {
    const { _hd, _main } = getSigners();

    const pendingTransaction = await _main.assetAllocationSend(
      txOptions,
      tokenOptions,
      await _hd.getNewChangeAddress(true),
      feeRate,
      _hd.getAccountXpub()
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const trezorSigner = new sys.utils.TrezorSigner();

    new sys.SyscoinJSLib(trezorSigner, _main.blockbookURL);

    try {
      const txid = await _main.signAndSend(
        pendingTransaction.psbt,
        pendingTransaction.assets,
        trezorSigner
      );

      return { txid };
    } catch (error) {
      throw new Error(`Bad Request: Could not create transaction, ${error}`);
    }
  };

  const confirmNativeTokenSend = async ({
    txOptions,
    outputs,
    feeRate,
  }: {
    txOptions: { rbf?: boolean };
    outputs: Array<{
      address: string;
      value: number;
    }>;
    feeRate: number;
  }): Promise<ITxid> => {
    const { _hd, _main } = getSigners();

    const pendingTransaction = await _main.createTransaction(
      txOptions,
      await _hd.getNewChangeAddress(true),
      outputs,
      feeRate,
      _hd.getAccountXpub()
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const trezorSigner = new sys.utils.TrezorSigner();

    new sys.SyscoinJSLib(trezorSigner, _main.blockbookURL);

    try {
      const txid = await _main.signAndSend(
        pendingTransaction.psbt,
        pendingTransaction.assets,
        trezorSigner
      );

      return { txid };
    } catch (error) {
      throw new Error(`Bad Request: Could not create transaction, ${error}`);
    }
  };

  // const signTransaction = (trezor, kdPath, {
  //   to,
  //   nonce,
  //   gasPrice,
  //   value,
  //   gas,
  //   data,
  //   from,
  //   chainId
  // }) => {
  //   const { addHexPrefix } = ethUtils;

  //   const sanitizedTxData = {
  //     to: addHexPrefix(to),
  //     nonce: addHexPrefix(nonce === '0x0' ? '00' : nonce),
  //     gasPrice: addHexPrefix(gasPrice),
  //     value: addHexPrefix(value),
  //     data: data !== '' ? addHexPrefix(data) : null,
  //     gasLimit: addHexPrefix(gas),
  //     from: addHexPrefix(from),
  //     chainId: chainId || 1
  //   };

  //   return new Promise(async (resolve, reject) => {
  //     const { result, payload: { v, r, s } } = await trezor.ethereumSignTransaction({
  //       path: kdPath,
  //       transaction: Object.assign({}, sanitizedTxData),
  //     });

  //     if (result.success) {
  //       const tx = new EthereumTx(sanitizedTxData);

  //       tx.v = v;
  //       tx.r = r;
  //       tx.s = s;

  //       // sanity check
  //       const sender = tx.getSenderAddress().toString('hex');

  //       if (from && (from !== sender)) {
  //         return reject('Signing address does not match sender');
  //       }

  //       // format the signed transaction for web3
  //       const signedTx = tx.serialize().toString('hex');

  //       return resolve(signedTx);
  //     }

  //     trezorConnect.ethereumSignTransaction({
  //       path: kdPath,
  //       transaction: _extends({}, sanitizedTxData)
  //     }).then(function (response) {

  //       if (response.success) {

  //       } else {
  //         return reject(response.payload.error);
  //       }
  //     });
  //   });
  // }

  const signMessage = (trezor: any, kdPath: any, txData: any) => {
    return new Promise(function (resolve, reject) {
      const { success, payload } = trezor.ethereumSignMessage({
        path: kdPath,
        message: txData,
      });

      if (success) {
        const signedTx = payload.signature;

        return resolve(signedTx);
      }

      return reject(payload.error);
    });
  };

  const verifyMessage = (trezor: any, kdPath: any, txData: any) => {
    trezor.ethereumVerifyMessage(
      kdPath,
      txData.signature,
      txData.Messsage,
      (response: any) => {
        return response;
      }
    );
  };

  return {
    confirmTokenMint,
    confirmTokenSend,
    confirmNativeTokenSend,
    signMessage,
    verifyMessage,
  };
};
