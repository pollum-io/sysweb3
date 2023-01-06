import { ethers } from 'ethers';
import { registeredCoinTypes as slip44, RegisteredCoinType } from 'slip44';

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

export const slip44TestnetCoinType = 2147483649;

export const getUtxoNetworkConfig = (coinType: number) => {
  try {
    const coin = slip44.find(([_coinType]: RegisteredCoinType) => {
      return _coinType === coinType;
    });

    const specificNetworkInfo = coins.find(
      (info: any) => info.slip44 === coinType
    ) as any;

    if (!coin || !specificNetworkInfo)
      throw new Error(
        'Could not get UTXO config for this network. Coin type is not registered in BIP44. See https://github.com/satoshilabs/slips/blob/master/slip-0044.md for available networks.'
      );

    const isTestnet = coin[1] === slip44TestnetCoinType;

    const {
      signedMessageHeader,
      bech32Prefix,
      xprvMagic,
      xpubMagic,
      addressType,
      addressTypeP2sh,
      wif,
    } = specificNetworkInfo;

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

    const pubTypes = getPubType(baseNetwork) || null;

    const config = {
      isTestnet,
      networks,
      slip44: coinType,
      pubTypes,
      baseNetwork,
    };

    return config;
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
