import { ITokenMap, ITxid, SyscoinHDSigner } from '@pollum-io/sysweb3-utils';
import sys from 'syscoinjs-lib';

const TrezorTransactions = (syscoin: { hdsigner: SyscoinHDSigner }) => {
  const { hdsigner } = syscoin;

  const confirmTokenMint = async ({
    tokenOptions,
    feeRate,
  }: { tokenOptions: ITokenMap, feeRate: number }): Promise<ITxid> => {
    const pendingTransaction = await syscoin.assetSend(
      { rbf: true },
      tokenOptions,
      await hdsigner.getNewChangeAddress(true),
      feeRate,
      hdsigner.getAccountXpub()
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const trezorSigner = new sys.utils.TrezorSigner();

    new sys.SyscoinJSLib(trezorSigner, syscoin.blockbookURL);

    try {
      const txid = await syscoin.signAndSend(
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
    const pendingTransaction = await syscoin.assetAllocationSend(
      txOptions,
      tokenOptions,
      await hdsigner.getNewChangeAddress(true),
      feeRate,
      hdsigner.getAccountXpub()
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const trezorSigner = new sys.utils.TrezorSigner();

    new sys.SyscoinJSLib(trezorSigner, syscoin.blockbookURL);

    try {
      const txid = await syscoin.signAndSend(
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
    const pendingTransaction = await syscoin.createTransaction(
      txOptions,
      await hdsigner.getNewChangeAddress(true),
      outputs,
      feeRate,
      hdsigner.getAccountXpub()
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const trezorSigner = new sys.utils.TrezorSigner();

    new sys.SyscoinJSLib(trezorSigner, syscoin.blockbookURL);

    try {
      const txid = await syscoin.signAndSend(
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