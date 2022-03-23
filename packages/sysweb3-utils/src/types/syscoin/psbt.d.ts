/// <reference types="node" />
import { Transaction } from 'bitcoinjs-lib';
export declare type PsbtCache = {
    __NON_WITNESS_UTXO_TX_CACHE: Transaction[];
    __NON_WITNESS_UTXO_BUF_CACHE: Buffer[];
    __TX_IN_CACHE: {
        [index: string]: number;
    };
    __TX: Transaction;
    __FEE_RATE?: number;
    __FEE?: number;
    __EXTRACTED_TX?: Transaction;
    __UNSAFE_SIGN_NONSEGWIT: boolean;
};
