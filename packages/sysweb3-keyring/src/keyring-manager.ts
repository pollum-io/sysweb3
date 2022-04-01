import { ObservableStore } from '@metamask/obs-store';
import SafeEventEmitter from '@metamask/safe-event-emitter';
// @ts-ignore
import * as sysweb3 from '@pollum-io/sysweb3-core';
import { IKeyringAccountState, IWalletState, initialWalletState, SyscoinHDSigner, encryptor } from '@pollum-io/sysweb3-utils';
import { generateMnemonic } from 'bip39';
import CryptoJS from 'crypto-js';
import { MainWallet } from './wallets/main';

export const KeyringManager = () => {
  const storage = sysweb3.sysweb3Di.getStateStorageDb();

  let _password = '';
  let _mnemonic = '';

  let wallet: IWalletState = initialWalletState;

  const { createWallet } = MainWallet({
    walletMnemonic: _mnemonic,
    isTestnet: wallet.activeNetwork.isTestnet,
    network: wallet.activeNetwork.url,
    blockbookURL: wallet.activeNetwork.url
  });

  const generatePhrase = () => {
    if (!_mnemonic) _mnemonic = generateMnemonic();

    return _mnemonic;
  };

  const getEncryptedMnemonic = () => {
    const encryptedMnemonic = CryptoJS.AES.encrypt(_mnemonic, _password);

    return encryptedMnemonic;
  };

  const getDecryptedMnemonic = () => {
    const decryptedMnemonic = CryptoJS.AES.decrypt(getEncryptedMnemonic(), _password);

    return decryptedMnemonic;
  };

  const getAccountById = (id: number): IKeyringAccountState =>
    Object.values(wallet.accounts).find(
      (account: IKeyringAccountState) => account.id === id
    ) || {} as IKeyringAccountState;

  const getPrivateKeyByAccountId = (id: number): string | null => {
    const account = Object.values(wallet.accounts).find(
      (account: IKeyringAccountState) => account.id === id
    );

    return account ? account.xprv : null;
  };

  const getState = () => wallet;
  const getNetwork = () => wallet.activeNetwork;
  const getAccounts = () => Object.values(wallet.accounts);

  const _memStore = new ObservableStore<{
    isUnlocked: boolean;
    wallet: IWalletState;
  }>({
    isUnlocked: false,
    wallet: initialWalletState,
  });

  const _clearWallet = () => {
    wallet = initialWalletState;

    _memStore.updateState({
      wallet: initialWalletState,
    });
  };

  const _persistWallet = (password: string = _password): string | Error => {
    if (typeof password !== 'string') {
      return new Error('KeyringManager - password is not a string');
    }

    console.log("trying to persist wallet", wallet, JSON.stringify(wallet));

    _password = password;

    const serializedWallet = JSON.stringify(wallet);

    return serializedWallet;
  };

  const _updateMemStoreWallet = () => {
    return _memStore.updateState({ wallet });
  };

  const _notifyUpdate = () => {
    const eventEmitter = new SafeEventEmitter();

    eventEmitter.emit('update', _memStore.getState());
  };

  const _fullUpdate = () => {
    _persistWallet(_password);
    _updateMemStoreWallet();
    _notifyUpdate();
  };

  const createVault = async ({
    encryptedPassword,
  }: {
    encryptedPassword: string;
  }): Promise<{ account: IKeyringAccountState, hd: SyscoinHDSigner, main: any }> => {
    _clearWallet();

    const vault: { account: IKeyringAccountState, hd: SyscoinHDSigner, main: any } = await createWallet({
      encryptedPassword,
      mnemonic: _mnemonic,
    });

    console.log('[keyring file test] creating wallet:', wallet);

    await _fullUpdate();

    return vault;
  };

  const setWalletPassword = (pwd: string) => {
    _password = pwd;
  };

  const addTokenToAccount = (accountId: number, address: string) => {
    const account: IKeyringAccountState = getAccountById(accountId);

    account.saveTokenInfo(address);

    _fullUpdate();

    return account;
  };

  const logout = () => {
    const eventEmitter = new SafeEventEmitter();

    _password = '';
    _memStore.updateState({ isUnlocked: false });
    eventEmitter.emit('lock');
    _notifyUpdate();
  };

  const _updateUnlocked = () => {
    const eventEmitter = new SafeEventEmitter();

    _memStore.updateState({ isUnlocked: true });
    eventEmitter.emit('unlock');
  };

  const login = async (password: string) => {
    wallet = await _unlockWallet(password);

    _updateUnlocked();
    _notifyUpdate();
  };

  const _unlockWallet = async (password: string): Promise<IWalletState> => {
    const encryptedVault = storage.get('vault');

    if (!encryptedVault) {
      _password = password;

      return {} as IWalletState;
    }

    _clearWallet();

    const decryptedWallet: string = encryptor.decrypt(password, encryptedVault);

    wallet = JSON.parse(decryptedWallet);

    _password = password;

    _updateMemStoreWallet();

    return wallet;
  };

  const removeAccount = () => { };

  const signTransaction = (tx: any, accountId: number, options = {}): void => {
    const account = getAccountById(accountId);

    account.signTransaction(account, tx, options);
  };

  const signMessage = (
    msgParams: { accountId: number; data: string },
    opts?: any
  ): void => {
    const account = getAccountById(msgParams.accountId);

    account.signMessage(account, msgParams.data, opts);
  };

  return {
    createVault,
    setWalletPassword,
    encryptedPassword: CryptoJS.SHA3(_password, getEncryptedMnemonic()),
    address: null,
    addTokenToAccount,
    getState,
    getNetwork,
    getAccountById,
    getPrivateKeyByAccountId,
    logout,
    login,
    getAccounts,
    removeAccount,
    signMessage,
    signTransaction,
    generatePhrase,
    getEncryptedMnemonic,
    getDecryptedMnemonic,
  };
};
