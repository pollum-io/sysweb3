import { Account, TransactionReceipt } from 'web3-core';
import { IEthereumToken, IEthereumNft } from '.';

export * from './tokens';
// export * from './transactions';
export * from './accounts';

export type web3 = {
  createAccount: () => Account;
  getBalance: (address: string) => Promise<string>;
  importAccount: (mnemonic: string, password: string) => Account;
  sendTransaction: (
    sender: string,
    receiver: string,
    value: number
  ) => Promise<TransactionReceipt>;
  setActiveNetwork: (chainId: number) => void;
  getNFTImage: (address: string, tokenId: number) => Promise<string | void>;
  getNftsByAddress: (address: string) => Promise<IEthereumNft[]>;
  getTokens: (
    address: string,
    tokenAddress: string
  ) => Promise<IEthereumToken | undefined>;
  getTokenIconBySymbol: (symbol: string) => Promise<
    | {
        thumbImage: string;
        largeImage: string;
      }
    | undefined
  >;
  web3Provider: any;
  validateCurrentRpc: () => Promise<boolean>;
};

export enum ISysWeb3 {
  web3,
  syscoin,
}
