import {
  EncryptedKeystoreV3Json,
  Sign,
  SignedTransaction,
  TransactionConfig,
} from 'web3-core';

import {
  INetwork,
  INetworkType,
  INewNFT,
  ITokenMint,
  ITokenSend,
  ITokenUpdate,
  ITxid,
} from '@pollum-io/sysweb3-utils';

export interface ITrezorWallet {
  createWallet: () => Promise<IKeyringAccountState>;
  forgetWallet: () => void;
  getAddress: (trezor: any, kdPath: any) => Promise<any>;
}

export interface ISyscoinTransactions {
  confirmMintNFT: (transaction: ITokenMint) => Promise<ITxid>;
  confirmNftCreation: (transaction: INewNFT) => Promise<ITxid>;
  confirmTokenMint: (transaction: ITokenMint) => Promise<ITxid>;
  confirmTokenCreation: (transaction: any) => Promise<{
    transactionData: any;
    txid: string;
    confirmations: number;
    guid: string;
  }>;
  confirmUpdateToken: (transaction: ITokenUpdate) => Promise<ITxid>;
  getRecommendedFee: (explorerUrl: string) => Promise<number>;
  sendTransaction: (transaction: ITokenSend) => Promise<ITxid>;
  signMessage: (account: IKeyringAccountState, tx: any, options: any) => void;
  signTransaction: (
    data: { psbt: string; assets: string },
    isSendOnly: boolean,
    isTrezor?: boolean
  ) => Promise<any>;
}

export interface IKeyringManager {
  addNewAccount: (label?: string) => Promise<IKeyringAccountState>;
  checkPassword: (password: string) => boolean;
  createKeyringVault: () => Promise<IKeyringAccountState>;
  createSeed: () => string;
  forgetMainWallet: (password: string) => void;
  forgetSigners: () => void;
  getAccounts: () => IKeyringAccountState[];
  getAccountById: (id: number) => IKeyringAccountState;
  getAccountXpub: () => string;
  getDecryptedMnemonic: () => string;
  getEncryptedMnemonic: () => string;
  getEncryptedXprv: () => string;
  getLatestUpdateForAccount: () => Promise<any>;
  getNetwork: () => INetwork;
  getPrivateKeyByAccountId: (id: number) => string;
  getSeed: (password: string) => string;
  getState: () => IWalletState;
  hasHdMnemonic: () => boolean;
  isUnlocked: () => boolean;
  login: (password: string) => Promise<IKeyringAccountState>;
  logout: () => void;
  removeAccount: (id: number) => void;
  removeNetwork: (chain: string, chainId: number) => void;
  setAccountIndexForDerivedAccount: (accountId: number) => void;
  setActiveAccount: (accountId: number) => void;
  setSignerNetwork: (
    network: INetwork,
    chain: string
  ) => Promise<IKeyringAccountState>;
  setWalletPassword: (password: string) => void;
  signMessage: (
    msgParams: { accountId: number; data: string },
    options?: any
  ) => void;
  trezor: ITrezorWallet;
  txs: ISyscoinTransactions;
  validateSeed: (seed: string) => boolean;
}

export enum KeyringAccountType {
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
      [chainId: number | string]: INetwork;
    };
    [INetworkType.Syscoin]: {
      [chainId: number | string]: INetwork;
    };
  };
  activeNetwork: INetwork;
}

export type IKeyringBalances = {
  [INetworkType.Syscoin]: number;
  [INetworkType.Ethereum]: number;
};

export interface IWeb3Account extends IKeyringAccountState {
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
  page: number;
  totalPages: number;
  itemsOnPage: number;
  address: string;
  balance: string;
  totalReceived: string;
  totalSent: string;
  unconfirmedBalance: string;
  unconfirmedTxs: number;
  txs: number;
}

export interface ILatestUpdateForSysAccount {
  transactions: any;
  assets: any;
  xpub: any;
  balances: {
    syscoin: number;
    ethereum: number;
  };
  receivingAddress: any;
}
