import { Account, TransactionReceipt } from 'web3-core';

export interface IWeb3 {
  createAccount: () => Account;
  getBalance: (walletAddress: string) => Promise<string>;
  importAccount: (privateKey: string) => Account;
  sendTransactions: (fromPrivateKey: string, toAddress: string, value: number) => Promise<TransactionReceipt>;
  changeNetwork: (chainId: number) => void;
  getNFTImage: (NFTAddress: string, tokenId: number) => Promise<string | void>;
  getTokens: (walletAddress: string, tokenAddress: string) => Promise<string | 0 | undefined>;
}
