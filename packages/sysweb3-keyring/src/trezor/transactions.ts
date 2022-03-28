import { ITokenMap, ITxid } from '@pollum-io/sysweb3-utils';
import sys from 'syscoinjs-lib';
import { Signer } from '../signer';

const TrezorTransactions = () => {
  const { hd, main } = Signer();

  const confirmTokenMint = async ({
    tokenOptions,
    feeRate,
  }: { tokenOptions: ITokenMap, feeRate: number }): Promise<ITxid> => {
    const pendingTransaction = await main.assetSend(
      { rbf: true },
      tokenOptions,
      await hd.getNewChangeAddress(true),
      feeRate,
      hd.getAccountXpub()
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const trezorSigner = new sys.utils.TrezorSigner();

    new sys.SyscoinJSLib(trezorSigner, main.blockbookURL);

    try {
      const txid = await main.signAndSend(
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
    const pendingTransaction = await main.assetAllocationSend(
      txOptions,
      tokenOptions,
      await hd.getNewChangeAddress(true),
      feeRate,
      hd.getAccountXpub()
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const trezorSigner = new sys.utils.TrezorSigner();

    new sys.SyscoinJSLib(trezorSigner, main.blockbookURL);

    try {
      const txid = await main.signAndSend(
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
    const pendingTransaction = await main.createTransaction(
      txOptions,
      await hd.getNewChangeAddress(true),
      outputs,
      feeRate,
      hd.getAccountXpub()
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const trezorSigner = new sys.utils.TrezorSigner();

    new sys.SyscoinJSLib(trezorSigner, main.blockbookURL);

    try {
      const txid = await main.signAndSend(
        pendingTransaction.psbt,
        pendingTransaction.assets,
        trezorSigner
      );

      return { txid };
    } catch (error) {
      throw new Error(`Bad Request: Could not create transaction, ${error}`);
    }
  };

  return {
    confirmTokenMint,
    confirmTokenSend,
    confirmNativeTokenSend,
  };
};

export default TrezorTransactions;