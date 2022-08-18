import { BIP32Interface } from 'bip32';
import { Psbt } from 'bitcoinjs-lib';
import CryptoJS from 'crypto-js';
import sys from 'syscoinjs-lib';

import { getDecryptedVault, INetwork } from '.';
import * as sysweb3 from '@pollum-io/sysweb3-core';
import { BitcoinNetwork, IPubTypes } from '@pollum-io/sysweb3-network';

let main = {} as SyscoinMainSigner;
let hd = {} as SyscoinHDSigner;

export const getSyscoinSigners = ({
  mnemonic,
  isTestnet,
  url,
  rpc,
}: ISyscoinSignerParams): { hd: SyscoinHDSigner; main: SyscoinMainSigner } => {
  let config: BitcoinNetwork | null = null;
  let slip44: number | null = null;
  let pubTypes: IPubTypes | null = null;

  let networks: { mainnet: BitcoinNetwork; testnet: BitcoinNetwork } | null =
    null;

  const hasRpcConfig = rpc && rpc.formattedBitcoinLikeNetwork;

  if (hasRpcConfig) {
    const { formattedNetwork, formattedBitcoinLikeNetwork } = rpc;

    const { networks: _bitcoinLikeNetworks, types } =
      formattedBitcoinLikeNetwork;

    config = isTestnet
      ? _bitcoinLikeNetworks.testnet
      : _bitcoinLikeNetworks.mainnet;

    networks = _bitcoinLikeNetworks;
    slip44 = formattedNetwork.chainId;
    pubTypes = types.zPubType;
  }

  if (!hd) {
    hd = new sys.utils.HDSigner(
      mnemonic,
      null,
      isTestnet,
      networks,
      slip44,
      pubTypes
    );
  }

  if (!main) {
    main = new sys.SyscoinJSLib(hd, url, config);
  }

  return {
    hd,
    main,
  };
};

export const getSigners = () => {
  const storage = sysweb3.sysweb3Di.getStateStorageDb();

  const { hash } = storage.get('vault-keys');

  const { network, isTestnet, mnemonic, rpc } = getDecryptedVault();

  const decryptedMnemonic = CryptoJS.AES.decrypt(mnemonic, hash).toString(
    CryptoJS.enc.Utf8
  );

  const { hd: _hd, main: _main } = getSyscoinSigners({
    mnemonic: decryptedMnemonic,
    isTestnet,
    url: network.url,
    rpc,
  });

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
