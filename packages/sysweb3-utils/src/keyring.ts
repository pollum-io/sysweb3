import { EncryptedKeystoreV3Json, Sign, SignedTransaction, TransactionConfig } from 'web3-core';
import {
  INetwork,
  INetworkType,
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
  signTransaction: (
    transactionConfig: TransactionConfig,
    callback?: (signTransaction: SignedTransaction) => void
  ) => Promise<SignedTransaction>;
  sign: (data: string) => Sign;
  encrypt: (password: string) => EncryptedKeystoreV3Json;
}

export interface IKeyringAccountState {
  address: string;
  id: number;
  isTrezorWallet: boolean;
  label: string;
  trezorId?: number;
  xprv: string;
  balances: IKeyringBalances;
  xpub: string;
  assets: any;
  transactions: any;
}

export interface ISyscoinBackendAccount {
  page: number,
  totalPages: number,
  itemsOnPage: number,
  address: string,
  balance: string,
  totalReceived: string,
  totalSent: string,
  unconfirmedBalance: string,
  unconfirmedTxs: number,
  txs: number
}