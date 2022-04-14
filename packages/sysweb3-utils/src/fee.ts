import sys from 'syscoinjs-lib';
import syscointx from 'syscointx-js';
import coinSelectSyscoin from 'coinselectsyscoin';
import { ethers } from 'ethers';

type EstimateFeeParams = {
  outputs: { value: number, address: string; }[],
  changeAddress: string;
  feeRateBN: any;
  network: string;
  xpub: string;
  explorerUrl: string;
}

export const feeUtils = () => {
  const estimateSysTransactionFee = async ({
    outputs,
    changeAddress,
    feeRateBN,
    network,
    xpub,
    explorerUrl
  }: EstimateFeeParams) => {
    const txOpts = { rbf: false };

    const utxos = await sys.utils.fetchBackendUTXOS(
      explorerUrl,
      xpub,
    );
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

  const estimateTokenTransferGasLimit = async (recipient: string, contractAddress: string, txAmount: ethers.BigNumber, defaultValue?: number) => {
    try {
      const contract = new ethers.Contract(contractAddress, '');

      const gasLimit: ethers.BigNumber = await contract.estimateGas.transfer(recipient, txAmount, { from: '' });

      return gasLimit.toNumber();
    }
    catch (error) {
      return defaultValue;
    }
  }

  return {
    estimateSysTransactionFee,
    getRecommendedFee,
    estimateTokenTransferGasLimit,
  }
}
