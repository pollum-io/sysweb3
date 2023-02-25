import { TransactionResponse } from '@ethersproject/abstract-provider';
import { ethers } from 'ethers';

import { setActiveNetwork, web3Provider } from '@pollum-io/sysweb3-network';
import { INetwork } from '@pollum-io/sysweb3-utils';

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

export const getFormattedTransactionResponse = async (
  provider:
    | ethers.providers.EtherscanProvider
    | ethers.providers.JsonRpcProvider,
  transaction: TransactionResponse,
  network: INetwork
) => {
  const currentProviderToUse = await validateCurrentProvider(provider, network);

  const tx = await currentProviderToUse.getTransaction(transaction.hash);
  if (tx) {
    const { timestamp } = await currentProviderToUse.getBlock(
      Number(tx.blockNumber)
    );
    return {
      ...tx,
      timestamp,
    };
  }
  return tx as TransactionResponse;
};
