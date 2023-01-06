import { BIP32Interface } from 'bip32';
import { Psbt } from 'bitcoinjs-lib';
import CryptoJS from 'crypto-js';
import sys from 'syscoinjs-lib';

import { getDecryptedVault, INetwork } from '.';
import * as sysweb3 from '@pollum-io/sysweb3-core';
import {
  BitcoinNetwork,
  IPubTypes,
  getUtxoNetworkConfig, // update package
} from '@pollum-io/sysweb3-network';

export const getSigners = () => {
  let _main: any;
  let _hd: SyscoinHDSigner;
  const storage = sysweb3.sysweb3Di.getStateStorageDb();

  const { hash } = storage.get('vault-keys');

  const { network, mnemonic } = getDecryptedVault();

  const decryptedMnemonic = CryptoJS.AES.decrypt(mnemonic, hash).toString(
    CryptoJS.enc.Utf8
  );

  const {
    baseNetwork,
    networks,
    isTestnet,
    slip44,
    pubTypes: { zPubType },
  } = getUtxoNetworkConfig(network.chainId);

  // @ts-ignore
  if (!_hd) {
    _hd = new sys.utils.HDSigner(
      decryptedMnemonic,
      null,
      isTestnet,
      networks,
      slip44,
      zPubType
    );
  }

  if (!_main) {
    _main = new sys.SyscoinJSLib(_hd, network.url, baseNetwork);
  }

  return {
    _hd,
    _main,
  };
};

export type SyscoinHdAccount = {
  pubTypes: IPubTypes;
  networks: {
    mainnet: BitcoinNetwork;
    testnet: BitcoinNetwork;
  };
  network: BitcoinNetwork;
  isTestnet: boolean;
  zprv: string;
};

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

export type ISyscoinSignerParams = {
  mnemonic: string;
  isTestnet: boolean;
  url: string;
  rpc?: {
    formattedNetwork: INetwork;
    formattedBitcoinLikeNetwork: {
      networks: { mainnet: BitcoinNetwork; testnet: BitcoinNetwork };
      types: { xPubType: IPubTypes; zPubType: IPubTypes };
    };
  };
};

export type IMainSignerParams = {
  hd: SyscoinHDSigner;
  url: string;
  network?: BitcoinNetwork;
};

export type IHdSignerParams = {
  mnemonic: string;
  password?: string;
  isTestnet?: boolean;
  networks?: { mainnet: BitcoinNetwork; testnet: BitcoinNetwork };
  slip44?: number;
  pubTypes?: IPubTypes;
};

export interface SyscoinHDSigner {
  Signer: {
    isTestnet: boolean;
    networks: { mainnet: BitcoinNetwork; testnet: BitcoinNetwork };
    password: string | null;
    SLIP44: number;
    network: BitcoinNetwork;
    pubTypes: IPubTypes;
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
    pubTypes: IPubTypes;
    network: BitcoinNetwork;
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

export type SyscoinMainSigner = {
  blockbookURL: string;
  Signer: SyscoinHDSigner;
  network: BitcoinNetwork;
};

// import { BIP32Interface } from 'bip32';
// import { Psbt } from 'bitcoinjs-lib';
// import CryptoJS from 'crypto-js';
// import sys from 'syscoinjs-lib';

// import { getDecryptedVault, INetwork, setEncryptedVault } from '.';
// import {
//   getUtxoNetworkConfig,
//   IPubTypes,
//   BitcoinNetwork,
// } from '../../sysweb3-network/src/index';
// import * as sysweb3 from '@pollum-io/sysweb3-core';

// export class GetSigners {
//   storage: any;
//   hd: SyscoinHDSigner;
//   main: SyscoinMainSigner;

//   constructor() {
//     this.storage = sysweb3.sysweb3Di.getStateStorageDb();
//     this.hd = {} as SyscoinHDSigner;
//     this.main = {} as SyscoinMainSigner;
//   }

//   init() {
//     const { hash } = this.storage.get('vault-keys');

//     const { network, mnemonic } = getDecryptedVault();

//     const decryptedMnemonic = CryptoJS.AES.decrypt(mnemonic, hash).toString(
//       CryptoJS.enc.Utf8
//     );

//     const {
//       baseNetwork,
//       networks,
//       isTestnet,
//       slip44,
//       pubTypes: { zPubType },
//     } = getUtxoNetworkConfig(network.chainId);

//     this.hd = new sys.utils.HDSigner(
//       decryptedMnemonic,
//       null,
//       isTestnet,
//       networks,
//       slip44,
//       zPubType
//     );

//     this.main = new sys.SyscoinJSLib(this.hd, network.url, baseNetwork);
//   }

//   getSigners() {
//     return {
//       hd: this.hd,
//       main: this.main,
//     };
//   }
// }
