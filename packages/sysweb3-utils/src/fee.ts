import sys from 'syscoinjs-lib';
import syscointx from 'syscointx-js';
import coinSelectSyscoin from 'coinselectsyscoin';
import { SyscoinHDSigner } from '.';

export const feeUtils = (hd: SyscoinHDSigner, main: any) => {
  const estimateSysTransactionFee = async (items: any) => {
    const { outputsArray, changeAddress, feeRateBN } = items;

    const txOpts = { rbf: false };

    const utxos = await sys.utils.fetchBackendUTXOS(
      main.blockbookURL,
      hd.getAccountXpub(),
    );
    const utxosSanitized = sys.utils.sanitizeBlockbookUTXOs(
      null,
      utxos,
      main.network
    );

    // 0 feerate to create tx, then find bytes and multiply feeRate by bytes to get estimated txfee 
    const tx = await syscointx.createTransaction(
      txOpts,
      utxosSanitized,
      changeAddress,
      outputsArray,
      new sys.utils.BN(0)
    );
    const bytes = coinSelectSyscoin.utils.transactionBytes(
      tx.inputs,
      tx.outputs
    );
    const txFee = feeRateBN.mul(new sys.utils.BN(bytes));

    return txFee;
  };

  const getRecommendedFee = async (): Promise<number> =>
    (await sys.utils.fetchEstimateFee(main.blockbookURL, 1)) / 10 ** 8;

  return {
    estimateSysTransactionFee,
    getRecommendedFee,
  }
}