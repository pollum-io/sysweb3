import { BitcoinNetwork } from '.';
import sys from 'syscoinjs-lib';

import { BIP32Interface } from 'bip32';
import * as sysweb3 from '@pollum-io/sysweb3-core';
import { Psbt } from 'bitcoinjs-lib';

export const MainSigner = ({
  walletMnemonic,
  isTestnet,
  blockbookURL,
}: {
  walletMnemonic: string;
  isTestnet: boolean;
  blockbookURL: string;
}): { hd: SyscoinHDSigner, main: any } => {
  let mainSigner: any;
  let hdSigner: SyscoinHDSigner;

  const getMainSigner = ({
    SignerIn,
    blockbookURL,
  }: {
    SignerIn?: any;
    blockbookURL?: string;
    network?: any;
  }) => {
    if (!mainSigner) {
      mainSigner = new sys.SyscoinJSLib(SignerIn, blockbookURL);
    }

    return mainSigner;
  };

  const getHdSigner = ({
    walletMnemonic,
    walletPassword,
    isTestnet,
    networks,
    SLIP44,
    pubTypes,
  }: {
    SLIP44?: string;
    isTestnet: boolean;
    networks?: BitcoinNetwork;
    pubTypes?: ISyscoinPubTypes;
    walletMnemonic: string;
    walletPassword?: string;
  }): SyscoinHDSigner => {
    if (!hdSigner) {
      hdSigner = new sys.utils.HDSigner(
        walletMnemonic,
        walletPassword,
        isTestnet,
        networks,
        SLIP44,
        pubTypes
      );
    }

    return hdSigner;
  };

  const hd = getHdSigner({ walletMnemonic, isTestnet });
  const main = getMainSigner({ SignerIn: hd, blockbookURL });

  return {
    hd,
    main,
  }
}

export const getSigners = () => {
  const storage = sysweb3.sysweb3Di.getStateStorageDb();

  const { mnemonic, network } = storage.get('signers-key');

  const { hd: _hd, main: _main } = MainSigner({
    walletMnemonic: mnemonic,
    isTestnet: network.chainId === 57 || network.chainId === 1,
    blockbookURL: network.url
  });

  return {
    _hd,
    _main,
  }
};

export type SyscoinHdAccount = {
  pubTypes: {
    mainnet: {
      zprv: string;
      zpub: string;
    };
    testnet: {
      vprv: string;
      vpub: string;
    }
  };
  networks: {
    mainnet: {
      messagePrefix: string;
      bech32: string;
      bip32: {
        public: number;
        private: number
      };
      pubKeyHash: number;
      scriptHash: number;
      wif: number;
    };
    testnet: {
      messagePrefix: string;
      bech32: string;
      bip32: {
        public: number;
        private: number
      };
      pubKeyHash: number;
      scriptHash: number;
      wif: number;
    }
  };
  network: {
    messagePrefix: string;
    bech32: string;
    bip32: {
      public: number;
      private: number
    };
    pubKeyHash: number;
    scriptHash: number;
    wif: number;
  };
  isTestnet: boolean;
  zprv: string;
}

export interface SyscoinFromZprvAccount extends SyscoinHdAccount {
  toNode: (zprv: string) => string;
  getAccountPrivateKey: () => string;
  getAccountPublicKey: () => string;
  getPrivateKey: () => string;
  getPublicKey: () => string;
  getAddress: () => string;
  getKeypair: () => string;
}

export interface SyscoinFromZpubAccount extends SyscoinHdAccount {
  toNode: (zprv: string) => string;
  getAccountPublicKey: () => string;
  getPublicKey: () => string;
  getAddress: () => string;
  getPayment: () => string;
}

export interface Bip84FromMnemonic {
  getRootPrivateKey: () => string;
  getRootPublicKey: () => string;
  deriveAccount: () => string;
}

export interface SyscoinHDSigner {
  Signer: {
    isTestnet: boolean;
    networks: {
      mainnet: {
        messagePrefix: string;
        bech32: string;
        bip32: {
          public: number;
          private: number
        };
        pubKeyHash: number;
        scriptHash: number;
        wif: number;
      };
      testnet: {
        messagePrefix: string;
        bech32: string;
        bip32: {
          public: number;
          private: number
        };
        pubKeyHash: number;
        scriptHash: number;
        wif: number;
      }
    };
    password: string | null;
    SLIP44: number;
    network: {
      messagePrefix: string;
      bech32: string;
      bip32: {
        public: number;
        private: number
      };
      pubKeyHash: number;
      scriptHash: number;
      wif: number;
    };
    pubTypes: {
      mainnet: {
        zprv: string;
        zpub: string;
      };
      testnet: {
        vprv: string;
        vpub: string;
      }
    };
    accounts: SyscoinFromZprvAccount[];
    changeIndex: number;
    receivingIndex: number;
    accountIndex: number;
    setIndexFlag: number;
    blockbookURL: string;
  };
  mnemonic: string;
  fromMnemonic: {
    seed: Buffer;
    isTestnet: boolean;
    coinType: number;
    pubTypes: {
      mainnet: {
        zprv: string;
        zpub: string;
      };
      testnet: {
        vprv: string;
        vpub: string;
      }
    };
    network: {
      messagePrefix: string;
      bech32: string;
      bip32: {
        public: number;
        private: number
      };
      pubKeyHash: number;
      scriptHash: number;
      wif: number;
    }
  };
  blockbookURL: string;
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

export type ISyscoinPubTypes = {
  mainnet: { zprv: string, zpub: string },
  testnet: { vprv: string, vpub: string }
}

export type SyscoinMainSigner = {
  blockbookURL: string,
  Signer: SyscoinHDSigner,
  network: {
    messagePrefix: string,
    bech32: string,
    bip32: {
      public: number,
      private: number
    },
    pubKeyHash: number,
    scriptHash: number,
    wif: number
  }
}