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
  transactions: any;
  assets: any;
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

export interface LatestUpdateForSysAccount {
  transactions: any;
  assets: any;
  xpub: any;
  balances: {
    syscoin: number;
    ethereum: number;
  };
  receivingAddress: any;
}

export interface KeyringManager {
  validateSeed: (seedphrase: string) => boolean;
  setWalletPassword: (pwd: string) => void;
  createSeed: () => string;
  createKeyringVault: () => Promise<IKeyringAccountState>;
  getAccountById: (id: number) => IKeyringAccountState,
  checkPassword: (pwd: string) => boolean,
  isUnlocked: () => boolean;
  getEncryptedMnemonic: () => string;
  getDecryptedMnemonic: () => string;
  getState: () => IWalletState;
  getNetwork: () => INetwork;
  getPrivateKeyByAccountId: (id: number) => string | null;
  logout: () => void;
  login: () => Promise<IKeyringAccountState>;
  getAccounts: () => {
    [accountId: number]: IKeyringAccountState,
  };
  removeAccount: (id: number) => void;
  setActiveNetworkForSigner: (network: INetwork) => Promise<IKeyringAccountState>;
  forgetMainWallet: (pwd: string) => void | Error;
  getEncryptedXprv: () => string;
  txs: () => any;
  trezor: () => any;
  getAccountXpub: () => string;
  getLatestUpdateForAccount: () => Promise<LatestUpdateForSysAccount>;
  setSignerNetwork: (network: INetwork) => Promise<IKeyringAccountState>;
  getSeed: () => string;
  hasHdMnemonic: () => boolean;
  forgetSigners: () => void;
  setAccountIndexForDerivedAccount: (accountId: number) => void;
  addNewAccount: (label?: string) => Promise<IKeyringAccountState>;
}
