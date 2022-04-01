import { EncryptedKeystoreV3Json, Sign, SignedTransaction, TransactionConfig } from 'web3-core';
import {
  INetwork,
  INetworkType,
  ISyscoinToken,
  IEthereumTransaction,
  ISyscoinTransaction,
} from '.';

export enum IKeyringAccountType {
  Trezor,
  Default,
}

export type IKeyringDApp = {
  id: number;
  url: string;
  active: boolean;
};

export interface IWalletState {
  accounts: {
    [id: number]: IKeyringAccountState;
  };
  activeAccount: IKeyringAccountState;
  activeToken: string;
  hasEncryptedVault: boolean;
  networks: {
    [INetworkType.Ethereum]: {
      [chainId: number]: INetwork;
    };
    [INetworkType.Syscoin]: {
      [chainId: number]: INetwork;
    };
  };
  activeNetwork: INetwork;
}

export type IKeyringBalances = {
  [INetworkType.Syscoin]: number;
  [INetworkType.Ethereum]: number;
};

export interface Web3Account extends IKeyringAccountState {
  address: string;
  privateKey: string;
  signTransaction: (
    transactionConfig: TransactionConfig,
    callback?: (signTransaction: SignedTransaction) => void
  ) => Promise<SignedTransaction>;
  sign: (data: string) => Sign;
  encrypt: (password: string) => EncryptedKeystoreV3Json;
}

export interface IKeyringAccountState {
  address: string;
  tokens: {
    [tokenId: string]: ISyscoinToken;
  };
  id: number;
  isTrezorWallet: boolean;
  label: string;
  transactions: {
    [txid: string]: ISyscoinTransaction | IEthereumTransaction;
  };
  trezorId?: number;
  xprv: string;
  balances: IKeyringBalances;
  xpub: string;
}
