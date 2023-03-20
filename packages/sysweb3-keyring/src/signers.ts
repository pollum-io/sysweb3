import { BIP32Interface } from 'bip32';
import { Psbt } from 'bitcoinjs-lib';
import CryptoJS from 'crypto-js';
import sys from 'syscoinjs-lib';

import { getDecryptedVault } from './storage';
import * as sysweb3 from '@pollum-io/sysweb3-core/src';
import {
  BitcoinNetwork,
  IPubTypes,
  INetwork,
} from '@pollum-io/sysweb3-network/src';

export const getSyscoinSigners = ({
  mnemonic,
  isTestnet,
  rpc,
}: ISyscoinSignerParams): { hd: SyscoinHDSigner; main: any } => {
  const { url } = rpc.formattedNetwork;
  let config: BitcoinNetwork | null = null;
  let slip44: number | null = null;
  let pubTypes: IPubTypes | null = null;
  let networks: { mainnet: BitcoinNetwork; testnet: BitcoinNetwork } | null =
    null;
  if (rpc.networkConfig) {
    const { formattedNetwork, networkConfig } = rpc;

    const { networks: _networkConfig, types } = networkConfig;

    config = isTestnet ? _networkConfig.testnet : _networkConfig.mainnet;

    networks = _networkConfig;
    slip44 = formattedNetwork.chainId;
    pubTypes = types.zPubType;
  }
  console.log('Creating hdSigner');
  const hd: SyscoinHDSigner = new sys.utils.HDSigner(
    mnemonic,
    null,
    isTestnet,
    networks,
    slip44,
    pubTypes
  );

  const main: any = new sys.SyscoinJSLib(hd, url, config);

  return {
    hd,
    main,
  };
};

export const getSigners = () => {
  const storage = sysweb3.sysweb3Di.getStateStorageDb();

  const { hash } = storage.get('vault-keys');

  const { isTestnet, mnemonic, rpc } = getDecryptedVault();
  console.log('mnemonic and hash', mnemonic, hash);

  const decryptedMnemonic = CryptoJS.AES.decrypt(mnemonic, hash).toString(
    CryptoJS.enc.Utf8
  );

  const { hd: _hd, main: _main } = getSyscoinSigners({
    mnemonic: decryptedMnemonic,
    isTestnet,
    rpc,
  });
  //todo: why do we need to change hd and main name into _ here? _ stands for non used variables

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
  rpc: {
    formattedNetwork: INetwork;
    networkConfig?: {
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
