import { ethers } from 'ethers';

import { coins } from './coins';

export const toHexFromNumber = (decimal: number) =>
  ethers.utils.hexlify(decimal);
export const toDecimalFromHex = (hexString: string) => parseInt(hexString, 16);

export const getPubType = (
  network: BitcoinNetwork
): { [type: string]: IPubTypes } => {
  const { private: _prv, public: _pub } = network.bip32;

  const pubString = String(_pub);
  const prvString = String(_prv);

  const xPubType = {
    mainnet: {
      zprv: prvString,
      zpub: pubString,
    },
    testnet: {
      vprv: prvString,
      vpub: pubString,
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

export const getFormattedBitcoinLikeNetwork = (
  slip44: number,
  coinName: string
) => {
  try {
    const coin = coins.find(
      (supported: any) => supported.coinName === coinName
    );

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

    const hexPubKeyHash = ethers.utils.hexlify(addressType);
    const hexScriptHash = ethers.utils.hexlify(addressTypeP2sh);

    const baseNetwork = {
      messagePrefix: String(signedMessageHeader).replace(/[\r\n]/gm, ''),
      bech32: String(bech32Prefix),
      bip32: {
        public: xpubMagic,
        private: xprvMagic,
      },
      pubKeyHash: hexPubKeyHash,
      scriptHash: hexScriptHash,
      wif,
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

export type Bip32 = {
  public: number;
  private: number;
};

export type BitcoinNetwork = {
  messagePrefix: string;
  bech32: string;
  bip32: Bip32;
  pubKeyHash: string;
  scriptHash: string;
  wif: number;
};

export type IPubTypes = {
  mainnet: { zprv: string; zpub: string };
  testnet: { vprv: string; vpub: string };
};
