/* eslint-disable camelcase */
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
  isTestnet: boolean
) => {
  const coin = coins.bitcoin.find((network: any) =>
    // eslint-disable-next-line prettier/prettier
    (isTestnet ? slip44 === 1 : network.slip44 === slip44)
  );

  if (!coin) throw new Error(`Coin info not found`);

  const {
    signed_message_header,
    bech32_prefix,
    xprv_magic,
    xpub_magic,
    address_type,
    address_type_p2sh,
  } = coin;

  const hexXpubMagic = toHexFromNumber(xpub_magic);
  const hexXprvMagic = toHexFromNumber(xprv_magic);
  const pubKeyHash = toHexFromNumber(address_type);
  const scriptHash = toHexFromNumber(address_type_p2sh);

  // get wif
  const network: BitcoinNetwork = {
    messagePrefix: `\x18${signed_message_header}`,
    bech32: String(bech32_prefix),
    bip32: {
      public: hexXpubMagic,
      private: hexXprvMagic,
    },
    pubKeyHash,
    scriptHash,
    wif: '',
  };

  return network;
};
