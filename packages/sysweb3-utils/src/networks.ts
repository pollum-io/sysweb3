import { coins } from 'coins';
import { BitcoinNetwork } from 'spsbt';

export enum INetworkType {
  Ethereum = 'ethereum',
  Syscoin = 'syscoin',
}

export type INetwork = {
  chainId: number;
  url: string;
  default?: boolean;
  label: string;
  key?: string;
  apiUrl?: string;
  currency?: string;
  explorer?: string;
};

export const toHexFromNumber = (decimal: number) => decimal.toString(16);
export const toDecimalFromHex = (hexString: string) => parseInt(hexString, 16);

export const getFormattedBitcoinLikeNetwork = (
  slip44: number,
  coinName: string
) => {
  const coin = coins.bitcoin.find(
    (network: any) => coinName === network.coinName && network.slip44 === slip44
  );

  if (!coin) throw new Error(`Coin info not found`);

  const {
    signedMessageHeader,
    bech32Prefix,
    xprvMagic,
    xpubMagic,
    addressType,
    addressTypeP2sh,
  } = coin;

  const isTestnet = coin.coinName.toLowerCase().includes('test');

  const hexXpubMagic = toHexFromNumber(xpubMagic);
  const hexXprvMagic = toHexFromNumber(xprvMagic);
  const pubKeyHash = toHexFromNumber(addressType);
  const scriptHash = toHexFromNumber(addressTypeP2sh);

  const network: BitcoinNetwork = {
    messagePrefix: `\x18${signedMessageHeader}`,
    bech32: String(bech32Prefix),
    bip32: {
      public: hexXpubMagic,
      private: hexXprvMagic,
    },
    pubKeyHash,
    scriptHash,
    wif: isTestnet ? '0xef' : '0x80',
  };

  return network;
};
