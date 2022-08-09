import { Transaction, Psbt } from 'bitcoinjs-lib';

export type Bip32 = {
  public: string;
  private: string;
};

export type BitcoinNetwork = {
  messagePrefix: string;
  bech32: string;
  bip32: Bip32;
  pubKeyHash: string;
  scriptHash: string;
  wif: string;
};

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
