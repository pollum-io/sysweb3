import { TransactionResponse } from '@ethersproject/abstract-provider';
import axios from 'axios';
import { Chain, chains } from 'eth-chains';
import { ethers } from 'ethers';
import _ from 'lodash';

import { getFormattedTransactionResponse } from './format';
import { setActiveNetwork, web3Provider } from '@pollum-io/sysweb3-network';
import {
  createContractUsingAbi,
  getErc20Abi,
  getNftStandardMetadata,
  getTokenStandardMetadata,
  IEthereumNftDetails,
  IEtherscanNFT,
  INetwork,
} from '@pollum-io/sysweb3-utils';

export interface IWeb3Accounts {
  createAccount: (privateKey: string) => ethers.Wallet;
  getBalance: (address: string) => Promise<number>;
  getErc20TokenBalance: (
    tokenAddress: string,
    walletAddress: string
  ) => Promise<number>;
  getErc20TokensByAddress: (
    address: string,
    isSupported: boolean,
    apiUrl: string
  ) => Promise<any[]>;
  getNftsByAddress: (
    address: string,
    isSupported: boolean,
    apiUrl: string
  ) => Promise<IEthereumNftDetails[]>;
  getAssetsByAddress: (
    address: string,
    network: INetwork
  ) => Promise<IEthereumNftDetails[]>;
  importAccount: (mnemonic: string) => ethers.Wallet;
  getUserTransactions: (
    address: string,
    network: INetwork
  ) => Promise<TransactionResponse[]>;
}

export const Web3Accounts = (): IWeb3Accounts => {
  const createAccount = (privateKey: string) => new ethers.Wallet(privateKey);

  const getBalance = async (address: string) => {
    try {
      const balance = await web3Provider.getBalance(address);
      const formattedBalance = ethers.utils.formatEther(balance);

      const roundedBalance = _.floor(parseFloat(formattedBalance), 4);

      return roundedBalance;
    } catch (error) {
      throw error;
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
      throw error;
    }
  };

  const getNftsByAddress = async (
    address: string,
    isSupported: boolean,
    apiUrl: string
  ) => {
    const etherscanQuery = `?module=account&action=tokennfttx&address=${address}&page=1&offset=100&&startblock=0&endblock=99999999&sort=asc&apikey=K46SB2PK5E3T6TZC81V1VK61EFQGMU49KA`;

    const apiUrlQuery = `?module=account&action=tokentx&address=${address}`;

    const query = isSupported ? etherscanQuery : apiUrlQuery;

    const {
      data: { result },
    } = await axios.get(`${apiUrl}${query}`);

    const nfts: IEthereumNftDetails[] = [];

    await Promise.all(
      result.map(async (nft: IEtherscanNFT) => {
        const isInTokensList =
          nfts.findIndex(
            (listedNft) => listedNft.contractAddress === nft.contractAddress
          ) > -1;

        if (isInTokensList) return;

        const details = await getNftStandardMetadata(
          nft.contractAddress,
          nft.tokenID,
          web3Provider
        );

        nfts.push({
          ...nft,
          ...details,
          isNft: true,
          id: nft.contractAddress,
          balance: 1,
        });
      })
    );

    return nfts;
  };

  const getErc20TokensByAddress = async (
    address: string,
    isSupported: boolean,
    apiUrl: string
  ) => {
    const etherscanQuery = `?module=account&action=tokentx&address=${address}&page=1&offset=100&&startblock=0&endblock=99999999&sort=asc&apikey=K46SB2PK5E3T6TZC81V1VK61EFQGMU49KA`;

    const apiUrlQuery = `?module=account&action=tokenlist&address=${address}`;

    const query = isSupported ? etherscanQuery : apiUrlQuery;

    const {
      data: { result },
    } = await axios.get(`${apiUrl}${query}`);

    const tokens: any[] = [];

    await Promise.all(
      result.map(async (token: any) => {
        const isInTokensList =
          tokens.findIndex(
            (listedToken) =>
              listedToken.contractAddress === token.contractAddress
          ) > -1;

        if (isInTokensList) return;

        const details = await getTokenStandardMetadata(
          token.contractAddress,
          address,
          web3Provider
        );

        tokens.push({
          ...token,
          ...details,
          isNft: false,
          id: token.contractAddress,
          balance: ethers.utils.formatEther(details.balance),
        });
      })
    );

    return tokens;
  };

  const getAssetsByAddress = async (
    address: string,
    network: INetwork
  ): Promise<IEthereumNftDetails[]> => {
    const etherscanSupportedNetworks = [
      'homestead',
      'ropsten',
      'rinkeby',
      'goerli',
      'kovan',
      'polygon',
      'mumbai',
    ];

    const tokensTransfers: any = [];

    try {
      const { chainId, label, apiUrl, url } = network;

      const networksLabels: { [chainId: number]: string } = {
        137: 'polygon',
        80001: 'mumbai',
        1: 'homestead',
      };

      const networkByLabel = networksLabels[chainId]
        ? networksLabels[chainId]
        : label.toLowerCase();

      const isSupported = etherscanSupportedNetworks.includes(networkByLabel);

      if (web3Provider.connection.url !== url) setActiveNetwork(network);

      const nfts = await getNftsByAddress(address, isSupported, String(apiUrl));
      const erc20Tokens = await getErc20TokensByAddress(
        address,
        isSupported,
        String(apiUrl)
      );

      const filter = {
        address,
        topics: [ethers.utils.id('Transfer(address,address,uint256)')],
      };

      web3Provider.on(filter, (transferToken) => {
        tokensTransfers.push(transferToken);
      });

      if (apiUrl) return [...nfts, ...erc20Tokens, ...tokensTransfers];

      return tokensTransfers;
    } catch (error) {
      throw error;
    }
  };

  const importAccount = (mnemonic: string) => {
    try {
      if (ethers.utils.isHexString(mnemonic)) {
        return new ethers.Wallet(mnemonic);
      }

      const { privateKey } = ethers.Wallet.fromMnemonic(mnemonic);

      const account = new ethers.Wallet(privateKey);

      return account;
    } catch (error) {
      throw error;
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

    try {
      const { chainId, default: _default, label, apiUrl } = network;

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

          return (
            [...pendingTransactions, ...history] || [...pendingTransactions]
          );
        }

        const query = `?module=account&action=txlist&address=${address}`;

        const {
          data: { result },
        } = await axios.get(`${apiUrl}${query}`);

        const txs = await Promise.all(
          result.map(
            async (tx: TransactionResponse) =>
              await getFormattedTransactionResponse(web3Provider, tx)
          )
        );

        return [...pendingTransactions, ...txs];
      }

      return [...pendingTransactions];
    } catch (error) {
      throw error;
    }
  };

  return {
    createAccount,
    getBalance,
    getErc20TokenBalance,
    getErc20TokensByAddress,
    getNftsByAddress,
    getAssetsByAddress,
    importAccount,
    getUserTransactions,
  };
};
