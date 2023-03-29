import { TransactionResponse } from '@ethersproject/abstract-provider';
import { TypedData, TypedMessage } from 'eth-sig-util';
import { ethers, BigNumber, BigNumberish } from 'ethers';
import {
  EncryptedKeystoreV3Json,
  Sign,
  SignedTransaction,
  TransactionConfig,
} from 'web3-core';

import { INetwork, INetworkType } from '@pollum-io/sysweb3-network';
import {
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

export interface IEthereumTransactions {
  signTypedData: (addr: string, typedData: any, version: Version) => string;
  ethSign: (params: string[]) => string;
  signPersonalMessage: (params: string[]) => string;
  parsePersonalMessage: (hexMsg: string) => string;
  decryptMessage: (msgParams: string[]) => string;
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
  getGasOracle?: () => Promise<any>;
  getEncryptedPubKey: () => string;
  toBigNumber: (aBigNumberish: string | number) => ethers.BigNumber;
  sendSignedErc20Transaction: ({
    networkUrl,
    receiver,
    tokenAddress,
    tokenAmount,
  }: ISendSignedErcTransactionProps) => Promise<IResponseFromSendErcSignedTransaction>;

  sendSignedErc721Transaction: ({
    networkUrl,
    receiver,
    tokenAddress,
    tokenId,
  }: ISendSignedErcTransactionProps) => Promise<IResponseFromSendErcSignedTransaction>;

  getBalance: (address: string) => Promise<number>;
  getErc20TokensByAddress?: (
    address: string,
    isSupported: boolean,
    apiUrl: string
  ) => Promise<any[]>;
  setWeb3Provider: (network: INetwork) => void;
  importAccount: (mnemonicOrPrivKey: string) => ethers.Wallet;
  web3Provider: ethers.providers.JsonRpcProvider;
}

export interface ISyscoinTransactions {
  confirmNftCreation: (tx: any) => { success: boolean };
  confirmTokenMint: (transaction: ITokenMint) => Promise<ITxid>;
  confirmTokenCreation: (transaction: any) => Promise<{
    transactionData: any;
    txid: string;
    confirmations: number;
    guid: string;
  }>;
  transferAssetOwnership: (transaction: any) => Promise<ITxid>;
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
  createKeyringVault: () => Promise<IKeyringAccountState>;
  forgetMainWallet: (password: string) => void;
  getAccountById: (
    id: number,
    accountType: KeyringAccountType
  ) => Omit<IKeyringAccountState, 'xprv'>;
  getAccountXpub: () => string;
  getEncryptedXprv: () => string;
  getNetwork: () => INetwork;
  getPrivateKeyByAccountId: (
    id: number,
    acountType: KeyringAccountType,
    pwd: string
  ) => string;
  getSeed: (password: string) => string;
  isUnlocked: () => boolean;
  logout: () => void;
  setActiveAccount: (
    accountId: number,
    accountType: KeyringAccountType
  ) => void;
  setSignerNetwork: (network: INetwork, chain: string) => Promise<boolean>;
  setWalletPassword: (password: string) => void;
  isSeedValid: (seed: string) => boolean;
  setSeed: (seed: string) => void;
  createNewSeed: () => void;
  setStorage: (client: any) => void;
  ethereumTransaction: IEthereumTransactions;
  syscoinTransaction: ISyscoinTransactions;
}

export enum KeyringAccountType {
  // Trezor = 'Trezor', //TODO: add trezor as we implement it on sysweb3
  Imported = 'Imported',
  HDAccount = 'HDAccount',
}

export type IKeyringDApp = {
  id: number;
  url: string;
  active: boolean;
};

export type accountType = {
  [id: number]: IKeyringAccountState;
};

export interface IWalletState {
  accounts: { [key in KeyringAccountType]: accountType };
  activeAccountId: number;
  activeAccountType: KeyringAccountType;
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
  isImported: boolean;
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
  xpub: any;
  balances: {
    syscoin: number;
    ethereum: number;
  };
  receivingAddress: any;
}

export interface ISendSignedErcTransactionProps {
  networkUrl: string;
  receiver: string;
  tokenAddress: string;
  maxPriorityFeePerGas?: BigNumberish;
  maxFeePerGas?: BigNumberish;
  gasLimit?: BigNumberish;
  tokenAmount?: string;
  tokenId?: number;
}

export interface IResponseFromSendErcSignedTransaction {
  type: number;
  chainId: number;
  nonce: number;
  maxPriorityFeePerGas: BigNumber;
  maxFeePerGas: BigNumber;
  gasPrice: BigNumber | null;
  gasLimit: BigNumber;
  to: string;
  value: BigNumber;
  data: string;
  accessList: any[];
  hash: string;
  v: number | null;
  r: string;
  s: string;
  from: string;
  confirmations: number | null;
  wait: any;
}
