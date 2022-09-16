import { TransactionResponse } from '@ethersproject/abstract-provider';
import { ethers } from 'ethers';

export const getFormattedTransactionResponse = async (
  provider:
    | ethers.providers.EtherscanProvider
    | ethers.providers.JsonRpcProvider,
  transaction: TransactionResponse
) => {
  const tx = await provider.getTransaction(transaction.hash);

  const { timestamp } = await provider.getBlock(Number(tx.blockNumber));

  return {
    ...tx,
    timestamp,
  };
};
