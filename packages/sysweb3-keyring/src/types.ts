import { TransactionResponse } from '@ethersproject/abstract-provider';
import { TypedData, TypedMessage } from 'eth-sig-util';
import { ethers, BigNumber, BigNumberish } from 'ethers';
import {
  EncryptedKeystoreV3Json,
  Sign,
  SignedTransaction,
  TransactionConfig,
} from 'web3-core';

import {
  INetwork,
  INetworkType,
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
  getTransactionCount: (address: string) => Promise<number>;
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
  getGasOracle: () => Promise<any>;
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
  checkPassword: (password: string) => boolean;
  createKeyringVault: () => Promise<IKeyringAccountState>;
  createSeed: () => string;
  forgetMainWallet: (password: string) => void;
  getAccounts: () => IKeyringAccountState[];
  getAccountById: (id: number) => IKeyringAccountState;
  getAccountXpub: () => string;
  getChangeAddress: (accountId: number) => string;
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
