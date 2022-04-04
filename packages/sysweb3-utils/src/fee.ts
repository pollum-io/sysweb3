import sys from 'syscoinjs-lib';
import syscointx from 'syscointx-js';
import coinSelectSyscoin from 'coinselectsyscoin';
import { SyscoinHDSigner } from '.';
import { ethers } from 'ethers';

const InfuraProvider = ethers.providers.InfuraProvider;

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

  const isValidEthereumAddress = (address: string) => {
    return ethers.utils.isAddress(address);
  }

  const getTransactionCount = (address: string, chainId = 1) => {
    const infuraProvider = new InfuraProvider();

    return infuraProvider.getTransactionCount(address, 'pending');
  }

  return {
    estimateSysTransactionFee,
    getRecommendedFee,
    estimateTokenTransferGasLimit,
    isValidEthereumAddress,
    getTransactionCount,
  }
}
