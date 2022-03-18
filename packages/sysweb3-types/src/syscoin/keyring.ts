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
  hasEncryptedVault: boolean;
  lastLogin: number;
  migrateWalletz?: any;
  networks: {
    [INetworkType.Ethereum]: {
      [chainId: number]: INetwork;
    };
    [INetworkType.Syscoin]: {
      [chainId: number]: INetwork;
    };
  };
  temporaryTransactionState: {
    executing: boolean;
    type: string;
  };
  timer: number;
  version: string;
  activeNetwork: number;
  getState: () => IWalletState;
}

export type IKeyringBalances = {
  [INetworkType.Syscoin]: number;
  [INetworkType.Ethereum]: number;
};

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
  saveTokenInfo(address: string): void;
  signTransaction(account: IKeyringAccountState, tx: any, options: any): void;
  signMessage(account: IKeyringAccountState, msg: any, options: any): void;
  getPrivateKey(signer: any): string;
}
