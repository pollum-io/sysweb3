import coinSelectSyscoin from 'coinselectsyscoin';
import { ethers } from 'ethers';
import syscointx from 'syscointx-js';

// @ts-ignore
import * as sys from './syscoints';

type EstimateFeeParams = {
  outputs: { value: number; address: string }[];
  changeAddress: string;
  feeRateBN: any;
  network: string;
  xpub: string;
  explorerUrl: string;
};

export const feeUtils = () => {
  const estimateSysTransactionFee = async ({
    outputs,
    changeAddress,
    feeRateBN,
    network,
    xpub,
    explorerUrl,
  }: EstimateFeeParams) => {
    const txOpts = { rbf: false };

    const utxos = await sys.utils.fetchBackendUTXOS(explorerUrl, xpub);
    const utxosSanitized = sys.utils.sanitizeBlockbookUTXOs(
      null,
      utxos,
      network
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

  const getRecommendedFee = async (explorerUrl: string): Promise<number> =>
    (await sys.utils.fetchEstimateFee(explorerUrl, 1)) / 10 ** 8;

  const convertGasFee = (value: string) =>
    ethers.utils.formatEther(String(value));

  return {
    estimateSysTransactionFee,
    getRecommendedFee,
    convertGasFee,
  };
};
