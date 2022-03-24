/// <reference types="node" />
import { BIP32Interface } from "bip32";
import { Psbt } from "bitcoinjs-lib";
export interface Bip84FromMnemonic {
    getRootPrivateKey: () => string;
    getRootPublicKey: () => string;
    deriveAccount: () => string;
}
export interface SyscoinHDSigner {
    signPSBT: (psbt: Psbt, pathIn?: string) => Psbt;
    sign: (psbt: Psbt, pathIn?: string) => Psbt;
    getMasterFingerprint: () => Buffer;
    deriveAccount: (index: number) => string;
    setAccountIndex: (accountIndex: number) => void;
    restore: (password: string) => boolean;
    backup: () => void;
    getNewChangeAddress: (skipIncrement?: boolean) => string;
    getNewReceivingAddress: (skipIncrement?: boolean) => string;
    createAccount: () => number;
    getAccountXpub: () => string;
    setLatestIndexesFromXPubTokens: (tokens: any) => void;
    createAddress: (addressIndex: number, isChange: boolean) => string;
    createKeypair: (addressIndex: number, isChange: boolean) => BIP32Interface;
    getHDPath: (addressIndex: number, isChange: boolean) => string;
    getAddressFromKeypair: (keypair: BIP32Interface) => string;
    getAddressFromPubKey: (pubkey: string) => string;
    deriveKeypair: (keypath: string) => BIP32Interface;
    derivePubKey: (keypath: string) => string;
    getRootNode: () => BIP32Interface;
}
export declare type ISyscoinPubTypes = {
    mainnet: {
        zprv: string;
        zpub: string;
    };
    testnet: {
        vprv: string;
        vpub: string;
    };
};
