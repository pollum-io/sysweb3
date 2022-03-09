import Web3 from 'web3';
import { Account, TransactionReceipt } from 'web3-core';
import { IEthereumCurrency } from './IEthereum';
import { IUserNFT } from './IUserNFT';

export interface IWeb3 {
  createAccount: () => Account;
  getBalance: (walletAddress: string) => Promise<string>;
  importAccount: (mnemonicOrPrivateKey: string, encryptedPwdAccount: string) => Account;
  sendTransactions: (
    fromPrivateKey: string,
    toAddress: string,
    value: number
  ) => Promise<TransactionReceipt>;
  changeNetwork: (chainId: number) => void;
  getNFTImage: (NFTAddress: string, tokenId: number) => Promise<string | void>;
  getUserNFT: (walletAddress: string) => Promise<IUserNFT[]>;
  getTokens: (
    walletAddress: string,
    tokenAddress: string
  ) => Promise<IEthereumCurrency | undefined>;
  getTokenIconBySymbol: (symbol: string) => Promise<
    | {
        thumbImage: string;
        largeImage: string;
      }
    | undefined
  >;
  web3Provider: any;
}
