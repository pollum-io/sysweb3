import { TransactionResponse } from '@ethersproject/abstract-provider';
import { Chain, chains } from 'eth-chains';
import { ethers } from 'ethers';
import _ from 'lodash';

import { getFormattedTransactionResponse } from './format';
import { jsonRpcRequest } from '@pollum-io/sysweb3-network';
import {
  createContractUsingAbi,
  getDecryptedVault,
  getErc20Abi,
  INetwork,
} from '@pollum-io/sysweb3-utils';

export interface IWeb3Accounts {
  createAccount: (privateKey: string) => ethers.Wallet;
  getBalance: (address: string) => Promise<number>;
  getErc20TokenBalance: (
    tokenAddress: string,
    walletAddress: string
  ) => Promise<number>;
  getUserTransactions: (
    address: string,
    network: INetwork
  ) => Promise<TransactionResponse[]>;
}

export const Web3Accounts = (): IWeb3Accounts => {
  const createAccount = (privateKey: string) => new ethers.Wallet(privateKey);

  const getBalance = async (address: string) => {
    try {
      const { network } = getDecryptedVault();

      const balance = await jsonRpcRequest(network.url, 'eth_getBalance', [
        address,
        'latest',
      ]);

      if (!balance) return 0;

      const formattedBalance = ethers.utils.formatEther(balance);

      const roundedBalance = _.floor(parseFloat(formattedBalance), 4);

      return roundedBalance;
    } catch (error) {
      throw new Error(`Could not get wallet balance. Error: ${error}`);
    }
  };

  const getErc20TokenBalance = async (
    tokenAddress: string,
    walletAddress: string
  ): Promise<number> => {
    try {
      const abi = getErc20Abi() as any;
      const balance = await createContractUsingAbi(abi, tokenAddress).balanceOf(
        walletAddress
      );

      const formattedBalance = ethers.utils.formatEther(balance);
      const roundedBalance = _.floor(parseFloat(formattedBalance), 4);

      return roundedBalance;
    } catch (error) {
      return 0;
    }
  };

  const getPendingTransactions = (
    chainId: number,
    address: string
  ): TransactionResponse[] => {
    const chain = chains.getById(chainId) as Chain;
    const chainWsUrl = chain.rpc.find((rpc) => rpc.startsWith('wss://'));

    const wsUrl = chain && chainWsUrl ? chainWsUrl : '';

    const needsApiKey = Boolean(wsUrl.includes('API_KEY'));

    const url = needsApiKey ? null : wsUrl;

    if (!url) return [];

    const wssProvider = new ethers.providers.WebSocketProvider(String(url));

    wssProvider.on('error', (error) => {
      throw error;
    });

    const pendingTransactions: TransactionResponse[] = [];

    wssProvider.on('pending', async (txhash) => {
      const tx = await wssProvider.getTransaction(txhash);

      const { from, to, hash, blockNumber } = tx;

      if (tx && (from === address || to === address)) {
        const { timestamp } = await wssProvider.getBlock(Number(blockNumber));

        const formattedTx = {
          ...tx,
          timestamp,
        };

        const isPendingTxIncluded =
          pendingTransactions.findIndex(
            (transaction: TransactionResponse) => transaction.hash === hash
          ) > -1;

        if (isPendingTxIncluded) return;

        pendingTransactions.push(formattedTx);
      }
    });

    return pendingTransactions;
  };

  const getUserTransactions = async (
    address: string,
    network: INetwork
  ): Promise<TransactionResponse[]> => {
    const etherscanSupportedNetworks = [
      'homestead',
      'ropsten',
      'rinkeby',
      'goerli',
      'kovan',
    ];

    const { chainId, default: _default, label } = network;

    const networkByLabel = chainId === 1 ? 'homestead' : label.toLowerCase();

    const pendingTransactions = getPendingTransactions(chainId, address);

    if (_default) {
      if (etherscanSupportedNetworks.includes(networkByLabel)) {
        const etherscanProvider = new ethers.providers.EtherscanProvider(
          networkByLabel,
          'K46SB2PK5E3T6TZC81V1VK61EFQGMU49KA'
        );

        const txHistory = await etherscanProvider.getHistory(address);

        const history = await Promise.all(
          txHistory.map(
            async (tx) =>
              await getFormattedTransactionResponse(etherscanProvider, tx)
          )
        );

        return [...pendingTransactions, ...history] || [...pendingTransactions];
      }
    }

    return pendingTransactions;
  };

  return {
    createAccount,
    getBalance,
    getErc20TokenBalance,
    getUserTransactions,
  };
};
