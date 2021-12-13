import {
  arrayUtils,
  sysDi,
  IHttpClient as _IHttpClient,
  IKeyValueDb as _IKeyValueDb,
  RestApi as _RestApi,
  RestApiOptionsRequest as _RestApiOptionsRequest
} from '@syscoin/core';
import { Snapshot as _Snapshot, Transaction as _Transaction } from '@syscoin/network';
import { keyStore, HDKey as _HDKey, DERIVATION_PATH as _DERIVATION_PATH } from '@syscoin/keystore';
import { PendingTx as _PendingTx, NetworkInfo as _NetworkInfo } from '@syscoin/network/types';
import { SyscoinAccount, SyscoinMonitor } from '@syscoin/wallet';
import { globalSyscoinNetwork } from '@syscoin/network';


export namespace syscoin4Types {
  export type HDKey = _HDKey;
  export type DERIVATION_PATH = _DERIVATION_PATH;
  export type RestApi = _RestApi;
  export type IKeyValueDb = _IKeyValueDb;
  export type IHttpClient = _IHttpClient;
  export type Transaction = _Transaction;
  export type PendingTx = _PendingTx;
  export type NetworkInfo = _NetworkInfo;
  export type Snapshot = _Snapshot;
  export type RestApiOptionsRequest = _RestApiOptionsRequest;
}

class syscoinPackages {
  private account: SyscoinAccount;
  private monitor: SyscoinMonitor;

  createAccount(privateKey?: string) {

    const account = new SyscoinAccount();

    if (privateKey) {
      account.loginPrivateKey(privateKey);
    }

    return account;
  }

  createOrGetGlobalAccount() {
    if (!this.account) {
      this.account = new SyscoinAccount();
    }
    return this.account;
  }

  createOrGetGlobalMonitor() {
    if (!this.monitor) {
      this.monitor = new SyscoinMonitor(this.createOrGetGlobalAccount());
    }
    return this.monitor;
  }
}

const syscoinPackages = new syscoinPackages();

export const syscoin4 = {
  keyStore,
  di: sysDi,
  createAccount(privateKey?: string) {
    return syscoinPackages.createAccount(privateKey);
  },
  get account() {
    return syscoinPackages.createOrGetGlobalAccount();
  },
  get monitor() {
    return syscoinPackages.createOrGetGlobalMonitor();
  },
  config: (config: SyscoinConfig) => {
    sysDi.getStateStorageDb().setPrefix(config.appId);
    globalSyscoinNetwork.config(config.network);
  },
  network: globalSyscoinNetwork,
  arrayUtils
}

type SyscoinConfig = {
  appId: string;
  network: syscoin4Types.NetworkInfo
}
