import { INetwork, INetworkType, ISyscoinToken, IEthereumTransaction, ISyscoinTransaction } from '.';
export declare enum IKeyringAccountType {
    Trezor = 0,
    Default = 1
}
export declare type IKeyringDApp = {
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
    lastLogin: number;
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
    activeNetwork: INetwork;
    getState: () => IWalletState;
}
export declare type IKeyringBalances = {
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
