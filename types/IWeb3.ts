import { Account, TransactionReceipt } from 'web3-core';

export interface IWeb3 {
  sysCreateAccount: () => Account;
  sysGetBalance: (walletAddress: string) => Promise<string>;
  sysImportAccount: (privateKey: string) => Account;
  sysSendTransactions: (fromPrivateKey: string, toAddress: string, value: number) => Promise<TransactionReceipt>;
  sysChangeNetwork: (chainId: number) => void;
}
