import { Account, TransactionReceipt } from 'web3-core';

export interface IWeb3 {
  createAccount: () => Account;
  getBalance: (walletAddress: string) => Promise<string>;
  importAccount: (privateKey: string) => Account;
  sendTransactions: (fromPrivateKey: string, toAddress: string, value: number) => Promise<TransactionReceipt>;
  changeNetwork: (chainId: number) => void;
}
