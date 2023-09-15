import { BIP32Interface } from 'bip32';
import { Psbt } from 'bitcoinjs-lib';

import {
  BitcoinNetwork,
  IPubTypes,
  INetwork,
} from '@pollum-io/sysweb3-network';
import { sys } from '@pollum-io/sysweb3-utils';

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
  // @ts-ignore
  const hd: SyscoinHDSigner = new sys.utils.HDSigner(
    mnemonic,
    null,
    isTestnet,
    networks,
    slip44,
    pubTypes,
    84
  );

  const main: any = new sys.SyscoinJSLib(hd, url, config);

  return {
    hd,
    main,
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
    accounts: any;
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
  deriveAccount: (index: number, bipNum?: number) => string;
  setAccountIndex: (accountIndex: number) => void;
  restore: (password: string, bipNum?: number) => boolean;
  backup: () => void;
  getNewChangeAddress: (skipIncrement?: boolean, bipNum?: number) => string;
  getNewReceivingAddress: (skipIncrement?: boolean, bipNum?: number) => string;
  createAccount: (bipNum?: number) => number;
  getAccountXpub: () => string;
  setLatestIndexesFromXPubTokens: (tokens: any) => void;
  createAddress: (
    addressIndex: number,
    isChange: boolean,
    bipNum?: number
  ) => string;
  createKeypair: (addressIndex: number, isChange: boolean) => BIP32Interface;
  getHDPath: (
    addressIndex: number,
    isChange: boolean,
    bipNum?: number
  ) => string;
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
