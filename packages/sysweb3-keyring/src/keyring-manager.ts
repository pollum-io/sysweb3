import { ObservableStore } from '@metamask/obs-store';
import SafeEventEmitter from '@metamask/safe-event-emitter';
// @ts-ignore
import * as sysweb3 from '@pollum-io/sysweb3-core';
import { IKeyringAccountState, IWalletState, initialWalletState } from '@pollum-io/sysweb3-utils';
import { encryptor } from '@pollum-io/sysweb3-utils';
import { generateMnemonic } from 'bip39';
import CryptoJS from 'crypto-js';
import { Signer } from './signer';
import { MainWallet } from './wallets/main';

export const KeyringManager = () => {
  const eventEmitter = new SafeEventEmitter();
  const storage = sysweb3.sysweb3Di.getStateStorageDb();

  const { createWallet } = MainWallet();

  let _password = '';
  let _mnemonic = '';

  let wallet: IWalletState = initialWalletState;

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

  const _persistWallet = (password: string = _password): CryptoJS.lib.CipherParams | Error => {
    if (typeof password !== 'string') {
      return new Error('KeyringManager - password is not a string');
    }

    _password = password;

    const serializedWallet = JSON.stringify(wallet);

    const encryptedWallet = encryptor.encrypt(serializedWallet, _password);

    storage.set('vault', encryptedWallet);

    return encryptedWallet;
  };

  const _updateMemStoreWallet = () => {
    const walletState = wallet.getState();

    return _memStore.updateState({ wallet: walletState });
  };

  const _notifyUpdate = () => {
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
  }): Promise<IKeyringAccountState> => {
    _clearWallet();

    const wallet: IKeyringAccountState = await createWallet({
      encryptedPassword,
      mnemonic: _mnemonic,
    });

    console.log('[keyring] creating wallet:', wallet);

    await _fullUpdate();

    return wallet;
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
    _password = '';
    _memStore.updateState({ isUnlocked: false });
    eventEmitter.emit('lock');
    _notifyUpdate();
  };

  const _updateUnlocked = () => {
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

  const signer = Signer();

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
    signer,
  };
};
