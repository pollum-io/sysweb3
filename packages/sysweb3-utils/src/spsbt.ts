import { Transaction, Psbt } from 'bitcoinjs-lib';

import { BitcoinNetwork } from './networks';

export interface SPSBT extends Psbt {
  getFeeRate: () => number;
  getFee: () => number;
  extractTransaction: (disableFeeCheck?: boolean) => Transaction;
  fromBase64: (
    data: string,
    options: {
      network?: BitcoinNetwork;
      maximumFeeRate?: number;
    }
  ) => Psbt;
}
