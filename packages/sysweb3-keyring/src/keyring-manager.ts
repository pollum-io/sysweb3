// @ts-nocheck
import { ObservableStore } from '@metamask/obs-store';
import SafeEventEmitter from '@metamask/safe-event-emitter';
import * as sysweb3 from '@pollum-io/sysweb3-core';
import {
  IKeyringAccountState,
  IWalletState,
  initialWalletState,
  INetwork,
} from '@pollum-io/sysweb3-utils';
import { generateMnemonic, validateMnemonic } from 'bip39';
import CryptoJS from 'crypto-js';
import { MainWallet } from './wallets/main';

export const KeyringManager = () => {
  const storage = sysweb3.sysweb3Di.getStateStorageDb();

  let _password = '';
  let _mnemonic = '';

  let wallet: IWalletState = initialWalletState;

  const checkPassword = (pwd: string) => _password === pwd;

  const mainWallet = MainWallet({ actions: { checkPassword } });

  const createSeed = () => {
    if (!_mnemonic) _mnemonic = generateMnemonic();

    return _mnemonic;
  };

  const isUnlocked = () =>
    Boolean((_mnemonic || mainWallet.hasHdMnemonic()) && _password);

  const getEncryptedMnemonic = () => {
    const encryptedMnemonic = CryptoJS.AES.encrypt(_mnemonic, _password);

    return String(encryptedMnemonic);
  };

  const getDecryptedMnemonic = () => {
    const decryptedMnemonic = CryptoJS.AES.decrypt(
      getEncryptedMnemonic(),
      _password
    ).toString();

    return decryptedMnemonic;
  };

  const getAccountById = (id: number): IKeyringAccountState =>
    Object.values(wallet.accounts).find((account) => account.id === id) ||
    ({} as IKeyringAccountState);

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
    isUnlocked: Boolean(_password && _mnemonic),
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

    console.log('trying to persist wallet', wallet, JSON.stringify(wallet));

    _password = password;

    const serializedWallet = JSON.stringify(wallet);

    // todo: encrypt serialized state
    /** set vault in storage so we can get back the state when logging in */
    storage.set('vault', serializedWallet);

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

  const createVault = async (): Promise<IKeyringAccountState> => {
    _clearWallet();

    const vault = await mainWallet.createWallet({
      password: _password,
      mnemonic: _mnemonic,
      wallet,
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

    mainWallet.saveTokenInfo(address);

    _fullUpdate();

    return account;
  };

  const logout = () => {
    const eventEmitter = new SafeEventEmitter();

    _clearTemporaryLocalKeys();

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
    if (!checkPassword(password)) return new Error('Invalid password');

    wallet = await _unlockWallet(password);

    _updateUnlocked();
    _notifyUpdate();

    return wallet;
  };

  const _unlockWallet = async (password: string): Promise<IWalletState> => {
    const serializedWallet = storage.get('vault');

    if (!serializedWallet) {
      _password = password;

      return {} as IWalletState;
    }

    _clearWallet();

    wallet = JSON.parse(serializedWallet);

    _password = password;

    _updateMemStoreWallet();

    return wallet;
  };

  const removeAccount = () => {};

  const signMessage = (
    msgParams: { accountId: number; data: string },
    opts?: any
  ): void => {
    const account = getAccountById(msgParams.accountId);

    mainWallet.txs.signMessage(account, msgParams.data, opts);
  };

  const _getVaultForActiveNetwork = async ({
    network,
    password,
  }: {
    password: string;
    network: INetwork;
  }) => {
    return await mainWallet.setSignerNetwork({
      password,
      mnemonic: _mnemonic,
      network,
    });
  };

  const setActiveNetworkForSigner = async ({
    network,
  }: {
    network: INetwork;
  }) => {
    const vault = _getVaultForActiveNetwork({ network, password: _password });

    _fullUpdate();

    return vault;
  };

  const _clearTemporaryLocalKeys = () => {
    _mnemonic = '';
    _password = '';
  };

  const forgetWallet = () => {
    _clearTemporaryLocalKeys();

    mainWallet.forgetSigners();
  };

  const getEncryptedXprv = () =>
    CryptoJS.AES.encrypt(
      mainWallet.getEncryptedPrivateKeyFromHd(),
      _password
    ).toString();

  const validateSeed = (seedphrase: string) => {
    if (validateMnemonic(seedphrase)) {
      _mnemonic = seedphrase;

      return true;
    }

    return false;
  };

  return {
    createVault,
    setWalletPassword,
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
    createSeed,
    getEncryptedMnemonic,
    getDecryptedMnemonic,
    setActiveNetworkForSigner,
    checkPassword,
    isUnlocked,
    forgetWallet,
    getEncryptedXprv,
    validateSeed,
    ...mainWallet,
  };
};
