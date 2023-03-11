import { TransactionResponse } from '@ethersproject/abstract-provider';
import { ethers } from 'ethers';

import { setActiveNetwork, web3Provider } from '@pollum-io/sysweb3-network/src'; //TODO: temp
import { INetwork } from '@pollum-io/sysweb3-utils/src'; //TODO: temp

const validateCurrentProvider = async (
  provider:
    | ethers.providers.EtherscanProvider
    | ethers.providers.JsonRpcProvider,
  network: INetwork
) => {
  const providerNetwork = await provider.getNetwork();

  const validateProvider = Boolean(providerNetwork.chainId === network.chainId);

  if (!validateProvider) {
    setActiveNetwork(network);

    return web3Provider;
  }

  return provider;
};

export const getTransactionTimestamp = async (
  provider:
    | ethers.providers.EtherscanProvider
    | ethers.providers.JsonRpcProvider,
  transaction: TransactionResponse
) => {
  const { timestamp } = await provider.getBlock(
    Number(transaction.blockNumber)
  );

  return {
    ...transaction,
    timestamp,
  } as TransactionResponse;
};

export const getFormattedTransactionResponse = async (
  provider:
    | ethers.providers.EtherscanProvider
    | ethers.providers.JsonRpcProvider,
  transaction: TransactionResponse,
  network: INetwork
) => {
  const currentProviderToUse = await validateCurrentProvider(provider, network);

  const tx = await currentProviderToUse.getTransaction(transaction.hash);

  if (!tx) {
    return await getTransactionTimestamp(currentProviderToUse, transaction);
  }
  return await getTransactionTimestamp(currentProviderToUse, tx);
};
