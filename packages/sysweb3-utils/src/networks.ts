import { getSupportedCoins } from 'coinsCreation';
import { ethers } from 'ethers';

export const toHexFromNumber = (decimal: number) =>
  ethers.utils.hexlify(decimal);
export const toDecimalFromHex = (hexString: string) => parseInt(hexString, 16);

export const getPubType = (
  network: BitcoinNetwork
): { [type: string]: IPubTypes } => {
  const { private: _prv, public: _pub } = network.bip32;

  const xPubType = {
    mainnet: {
      zprv: _prv,
      zpub: _pub,
    },
    testnet: {
      vprv: _prv,
      vpub: _pub,
    },
  };

  const zPubType = {
    mainnet: { zprv: '04b2430c', zpub: '04b24746' },
    testnet: { vprv: '045f18bc', vpub: '045f1cf6' },
  };

  return {
    xPubType,
    zPubType,
  };
};

export const validateNetworkWif = (
  wif: string,
  start: string,
  type: number
) => {
  const wifType = type === 0 ? 50 : 51;
  const regex = new RegExp(
    `^${start}[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{${wifType}}$`
  );

  return regex.test(wif);
};

export const getFormattedBitcoinLikeNetwork = (
  slip44: number,
  coinName: string
) => {
  try {
    const coins = getSupportedCoins();

    const coin = coins[coinName];

    if (!(coin && coin.slip44 === slip44))
      throw new Error(`Coin info not found`);

    const {
      signedMessageHeader,
      bech32Prefix,
      xprvMagic,
      xpubMagic,
      addressType,
      addressTypeP2sh,
      wif,
    } = coin;

    const isTestnet = coin.name.toLowerCase().includes('test');

    const hexXpubMagic = ethers.utils.hexlify(xpubMagic);
    const hexXprvMagic = ethers.utils.hexlify(xprvMagic);
    const hexPubKeyHash = ethers.utils.hexlify(addressType);
    const hexScriptHash = ethers.utils.hexlify(addressTypeP2sh);
    const hexWif = ethers.utils.hexlify(wif);

    if (!validateNetworkWif)
      throw new Error('Private key prefix not valid for this network.');

    const baseNetwork = {
      messagePrefix: signedMessageHeader,
      bech32: String(bech32Prefix),
      bip32: {
        public: hexXpubMagic,
        private: hexXprvMagic,
      },
      pubKeyHash: hexPubKeyHash,
      scriptHash: hexScriptHash,
      wif: hexWif,
    };

    const networks = {
      mainnet: baseNetwork,
      testnet: baseNetwork,
    };

    const useMainnet = networks.mainnet && !isTestnet;

    const networkChain = useMainnet ? networks.mainnet : networks.testnet;

    return {
      networks,
      types: getPubType(networkChain) || null,
    };
  } catch (error) {
    throw new Error(error);
  }
};

export enum INetworkType {
  Ethereum = 'ethereum',
  Syscoin = 'syscoin',
}

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

export type IPubTypes = {
  mainnet: { zprv: string; zpub: string };
  testnet: { vprv: string; vpub: string };
};

export type ICoinCreationParams = {
  name: string;
  networkVersion: number;
  privateKeyPrefix: number;
  wifStart: string;
  cWifStart: string;
};
