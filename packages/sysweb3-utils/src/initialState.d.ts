import { IWalletState } from '@pollum-io/sysweb3-utils';
export declare const initialActiveAccountState: {
    address: string;
    tokens: {};
    balances: {
        ethereum: number;
        syscoin: number;
    };
    id: number;
    isTrezorWallet: boolean;
    label: string;
    transactions: {};
    trezorId: number;
    xprv: string;
    xpub: string;
    saveTokenInfo(): void;
    signTransaction(): void;
    signMessage(): void;
    getPrivateKey: () => string;
};
export declare const initialNetworksState: {
    syscoin: {
        0: {
            chainId: number;
            label: string;
            url: string;
            default: boolean;
        };
        1: {
            chainId: number;
            label: string;
            url: string;
            default: boolean;
        };
    };
    ethereum: {
        0: {
            chainId: number;
            label: string;
            url: string;
            default: boolean;
        };
    };
};
export declare const initialWalletState: IWalletState;
