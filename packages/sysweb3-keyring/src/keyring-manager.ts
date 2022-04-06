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
import { SyscoinAddress } from './address';
import { generateMnemonic, validateMnemonic } from 'bip39';
import CryptoJS from 'crypto-js';
import { MainWallet } from './wallets/main';
import TrezorTransactions from './trezor/transactions';
import { TrezorWallet } from './trezor';
import { SyscoinTransactions } from './transactions';

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

  const isUnlocked = () => Boolean(_mnemonic && mainWallet.hasHdMnemonic() && _password);

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

  /** controllers */

  const controllersData = { mnemonic: _mnemonic, wallet };

  const _trezorTxs = TrezorTransactions(controllersData);
  const trezor = TrezorWallet({ ...controllersData, tx: _trezorTxs });
  const txs = SyscoinTransactions(controllersData);
  const address = SyscoinAddress(controllersData);

  /** end */

  const _memStore = new ObservableStore<{
    isUnlocked: boolean;
    wallet: IWalletState;
  }>({
    isUnlocked: Boolean(_password && _mnemonic && mainWallet.hasHdMnemonic()),
    wallet: initialWalletState,
  });

  _memStore.subscribe((value) => {
    console.log('saw value:', value);
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

    console.log("trying to persist wallet");

    _password = password;

    const serializedWallet = JSON.stringify(wallet);

    // todo: encrypt serialized state
    /** set vault in storage so we can get back the state when logging in */
    storage.set('vault', serializedWallet);

    console.log('vault stored in our storage', storage.get('vault'));

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

  const createKeyringVault = async (): Promise<IKeyringAccountState> => {
    _clearWallet();

    const vault = await mainWallet.createMainWallet({
      password: _password,
      mnemonic: _mnemonic,
      wallet,
    });

    wallet = {
      ...wallet,
      accounts: {
        ...wallet.accounts,
        [vault.id]: vault
      },
      activeAccount: vault,
    }

    console.log('[keyring file test] creating wallet:', wallet);

    await _fullUpdate();

    return vault;
  };

  const setWalletPassword = (pwd: string) => {
    _password = pwd;
  };

  const addTokenToAccount = (accountId: number) => {
    const account: IKeyringAccountState = getAccountById(accountId);

    // mainWallet.saveTokenInfo(address);

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

  const login = async (password: string): Promise<IKeyringAccountState | Error> => {
    console.log('passwords', password, _password)
    if (!checkPassword(password)) return new Error('Invalid password');

    wallet = await _unlockWallet(password);

    _updateUnlocked();
    _notifyUpdate();
    _updateMemStoreWallet();

    return wallet.activeAccount;
  };

  const _unlockWallet = async (password: string): Promise<IWalletState> => {
    const serializedWallet = storage.get('vault');

    console.log('unlock wallet', serializedWallet)

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

  const removeAccount = () => { };

  const signMessage = (
    msgParams: { accountId: number; data: string },
    opts?: any
  ): void => {
    const account = getAccountById(msgParams.accountId);

    txs.signMessage(account, msgParams.data, opts);
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
      index: wallet.activeAccount.id
    });
  };

  const setActiveNetworkForSigner = async ({ network }: { network: INetwork }) => {
    const vault = await _getVaultForActiveNetwork({ network, password: _password });

    console.log('[changing network keyring] account', vault)

    wallet = {
      ...wallet,
      accounts: {
        ...wallet.accounts,
        [vault.id]: vault,
      },
      activeNetwork: network,
      activeAccount: vault,
    }

    console.log('[changing network keyring] wallet', wallet)

    _fullUpdate();

    console.log('[changing network keyring] full update', wallet)

    return vault;
  };

  const _clearTemporaryLocalKeys = () => {
    _mnemonic = '';
    _password = '';
  };

  const forgetMainWallet = () => {
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
    validateSeed,
    setWalletPassword,
    createSeed,
    createKeyringVault,
    getAccountById,
    checkPassword,
    isUnlocked,
    getEncryptedMnemonic,
    getDecryptedMnemonic,
    addTokenToAccount,
    getState,
    getNetwork,
    getPrivateKeyByAccountId,
    logout,
    login,
    getAccounts,
    removeAccount,
    signMessage,
    setActiveNetworkForSigner,
    forgetMainWallet,
    getEncryptedXprv,
    address,
    txs,
    trezor,
    ...mainWallet,
  };
};
