import { TransactionResponse } from '@ethersproject/abstract-provider';
import { TypedData, TypedMessage } from 'eth-sig-util';
import { ethers } from 'ethers';
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
  createHardwareWallet: () => Promise<IKeyringAccountState>;
}

export interface ISendTransaction {
  sender: string;
  receivingAddress: string;
  amount: number;
  gasLimit?: number;
  gasPrice?: number;
  token?: any;
}
export type SimpleTransactionRequest = {
  to: string;
  from: string;
  nonce?: ethers.BigNumberish;
  gasLimit?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;

  data?: ethers.BytesLike;
  value?: ethers.BigNumberish;
  chainId: number;

  type?: number;
  accessList?: ethers.utils.AccessListish;

  maxPriorityFeePerGas: ethers.BigNumberish;
  maxFeePerGas: ethers.BigNumberish;

  customData?: Record<string, any>;
  ccipReadEnabled?: boolean;
};

export declare type Version = 'V1' | 'V2' | 'V3' | 'V4';
export interface EthEncryptedData {
  version: string;
  nonce: string;
  ephemPublicKey: string;
  ciphertext: string;
}

export interface IEthereumTransactions {
  getTransactionCount: (address: string) => Promise<number>;
  signTypedData: (addr: string, typedData: any, version: Version) => string;
  ethSign: (params: string[]) => string;
  signPersonalMessage: (params: string[]) => string;
  parsePersonalMessage: (hexMsg: string) => string;
  decryptMessage: (addr: string, encryptedData: EthEncryptedData) => string;
  verifyPersonalMessage: (msg: string, sign: string) => string;
  verifyTypedSignature: (
    data: TypedData | TypedMessage<any>,
    signature: string,
    version: Version
  ) => string;
  sendTransaction: (data: ISendTransaction) => Promise<TransactionResponse>;
  sendFormattedTransaction: (
    data: SimpleTransactionRequest
  ) => Promise<TransactionResponse>;
  getRecommendedNonce: (address: string) => Promise<number>;
  getFeeByType: (type: string) => Promise<string>;
  getFeeDataWithDynamicMaxPriorityFeePerGas: () => Promise<any>;
  getGasLimit: (toAddress: string) => Promise<number>;
  getTxGasLimit: (tx: SimpleTransactionRequest) => Promise<ethers.BigNumber>;
  getRecommendedGasPrice: (formatted?: boolean) => Promise<
    | string
    | {
        gwei: string;
        ethers: string;
      }
  >;
  getGasOracle: () => Promise<any>;
  getEncryptedPubKey: () => string;
  toBigNumber: (aBigNumberish: string | number) => ethers.BigNumber;
}

export interface ISyscoinTransactions {
  confirmMintNFT: (transaction: ITokenMint) => Promise<ITxid>;
  confirmNftCreation: () => {
    create: (
      tx: INewNFT
    ) => Promise<{ parent: { guid: string; txid: string } }>;
    mint: (tx: INewNFT, guid: string) => Promise<ITxid>;
    update: (tx: INewNFT, guid: string) => Promise<ITxid>;
  };
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
  getAccounts: () => IKeyringAccountState[];
  getAccountById: (id: number) => IKeyringAccountState;
  getAccountXpub: () => string;
  getDecryptedMnemonic: () => string;
  getDecryptedPrivateKey: (key: string) => string;
  getEncryptedMnemonic: () => string;
  getEncryptedXprv: () => string;
  getLatestUpdateForAccount: () => Promise<any>;
  getNetwork: () => INetwork;
  getPrivateKeyByAccountId: (id: number) => string;
  getSeed: (password: string) => string;
  getState: () => IWalletState;
  isUnlocked: () => boolean;
  login: (password: string) => Promise<IKeyringAccountState>;
  logout: () => void;
  removeAccount: (id: number) => void;
  removeNetwork: (chain: string, chainId: number) => void;
  addAccountToSigner: (accountId: number) => void;
  setActiveAccount: (accountId: number) => void;
  setSignerNetwork: (
    network: INetwork,
    chain: string
  ) => Promise<IKeyringAccountState>;
  setWalletPassword: (password: string) => void;
  trezor: ITrezorWallet;
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
