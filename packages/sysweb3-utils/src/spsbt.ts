import { Transaction, Psbt } from 'bitcoinjs-lib';

import { BitcoinNetwork } from '@pollum-io/sysweb3-network';

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
