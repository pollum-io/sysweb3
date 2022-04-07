// @ts-nocheck
import { ObservableStore } from '@metamask/obs-store';
import SafeEventEmitter from '@metamask/safe-event-emitter';
import * as sysweb3 from '@pollum-io/sysweb3-core';
import sys from 'syscoinjs-lib';
import {
  IKeyringAccountState,
  IWalletState,
  initialWalletState,
  INetwork,
  MainSigner,
} from '@pollum-io/sysweb3-utils';
import { generateMnemonic, validateMnemonic } from 'bip39';
import CryptoJS from 'crypto-js';
import { MainWallet } from './wallets/main';
import TrezorTransactions from './trezor/transactions';
import { TrezorWallet } from './trezor';
import { SyscoinTransactions } from './transactions';
import { Web3Accounts } from './accounts';
import { networks, setActiveNetwork } from '@pollum-io/sysweb3-network';
import { fromZPrv } from 'bip84';

export const KeyringManager = () => {
  const storage = sysweb3.sysweb3Di.getStateStorageDb();

  let _password = '';
  let _mnemonic = '';

  let wallet: IWalletState = initialWalletState;

  const checkPassword = (pwd: string) => _password === pwd;

  const createSeed = () => {
    if (!_mnemonic) _mnemonic = generateMnemonic();

    return _mnemonic;
  };

  const isUnlocked = () => Boolean(_mnemonic && hasHdMnemonic() && _password);

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

  /** end */

  const _memStore = new ObservableStore<{
    isUnlocked: boolean;
    wallet: IWalletState;
  }>({
    isUnlocked: Boolean(_password && _mnemonic && hasHdMnemonic()),
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

    const vault = await createMainWallet();

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

    // saveTokenInfo(address);

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

  const setActiveNetworkForSigner = async (network: INetwork) => {
    const vault = await setSignerNetwork(network);

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

    forgetSigners();
  };

  const getEncryptedXprv = () =>
    CryptoJS.AES.encrypt(
      _getEncryptedPrivateKeyFromHd(),
      _password
    ).toString();

  const validateSeed = (seedphrase: string) => {
    if (validateMnemonic(seedphrase)) {
      _mnemonic = seedphrase;

      return true;
    }

    return false;
  };

  /** main wallet */

  const web3Wallet = Web3Accounts();

  let hd: SyscoinHDSigner = {} as SyscoinHDSigner;
  let main: SyscoinMainSigner = {} as SyscoinMainSigner;

  /** set/get account info */

  const _getBackendAccountData = async (): Promise<{
    xpub: string;
    balance: number;
    transactions: any;
    tokens: any;
    receivingAddress: string;
  }> => {
    const { hd: _hd, main: _main } = MainSigner({
      walletMnemonic: _mnemonic,
      isTestnet: wallet.activeNetwork.isTestnet,
      network: wallet.activeNetwork.url,
      blockbookURL: wallet.activeNetwork.url
    });

    hd = _hd;
    main = _main;

    storage.set('signers', { _hd, _main });

    console.log('[_getBackendAccountData]', { hd, main });

    const { address } =
      await sys.utils.fetchBackendAccount(
        main.blockbookURL,
        getAccountXpub(),
        'tokens=nonzero&details=txs',
        true
      );

    const receivingAddress = await hd.getNewReceivingAddress(true);

    console.log('[_ntData] response', { hd, main, address });

    return {
      receivingAddress,
      xpub: address,
      balance: 0 / 1e8,
      transactions: {},
      tokens: {},
    };
  };

  const getAccountXpub = (): string => hd.getAccountXpub();

  const _getInitialAccountData = ({
    label,
    signer,
    createdAccount,
    xprv,
  }: { label?: string, signer: any, createdAccount: any, xprv: string }) => {
    console.log('[get initial account data] getting initial account...')
    const { balance, receivingAddress, xpub } = createdAccount;

    const account = {
      id: signer.Signer.Signer.accountIndex,
      label: label ? label : `Account ${signer.Signer.Signer.accountIndex + 1}`,
      balances: {
        syscoin: balance,
        ethereum: 0,
      },
      xpub,
      xprv,
      address: receivingAddress,
      isTrezorWallet: false,
    };

    return account;
  };

  const _getEncryptedPrivateKeyFromHd = () => hd.Signer.accounts[hd.Signer.accountIndex].getAccountPrivateKey();

  const getLatestUpdateForAccount = async () => {
    const backendAccountData = await _getBackendAccountData();

    console.log(
      '[getLatestUpdateForAccount] backend account data',
      {
        backendAccountData,
        main,
        hd,
      }
    );

    return backendAccountData;
  };

  /** end */

  /** set/get networks */

  const _getAccountForNetwork = async ({ isSyscoinChain, network }: { isSyscoinChain: boolean, network: INetwork }) => {
    if (isSyscoinChain) {
      const { hd: _hd, main: _main } = MainSigner({
        walletMnemonic: _mnemonic,
        isTestnet: network.isTestnet,
        network: network.url,
        blockbookURL: network.url
      });

      hd = _hd;
      main = _main;

      storage.set('signers', { _hd, _main });

      const xprv = getEncryptedXprv();

      const updatedAccountInfo = await getLatestUpdateForAccount();

      console.log('[switch network] getting created account', updatedAccountInfo, updatedAccountInfo.address);

      const account = _getInitialAccountData({
        signer: main,
        createdAccount: updatedAccountInfo,
        xprv,
      });
      console.log('[switch network] got created account', updatedAccountInfo, updatedAccountInfo.address);

      hd && hd.setAccountIndex(account.id);

      return account;
    }

    const web3Account = web3Wallet.importAccount(_mnemonic);

    const balance = await web3Wallet.getBalance(web3Account.address);

    const id = wallet.activeAccount;

    return {
      ...web3Account,
      assets: {},
      id,
      isTrezorWallet: false,
      label: `Account ${id}`,
      transactions: {},
      trezorId: -1,
      xprv: '',
      balances: {
        ethereum: balance,
        syscoin: 0,
      },
      xpub: '',
    } as IKeyringAccountState;
  }

  const setSignerNetwork = async (network: INetwork): Promise<IKeyringAccountState> => {
    const isSyscoinChain = Boolean(networks.syscoin[network.chainId]);

    if (!isSyscoinChain) {
      setActiveNetwork('ethereum', network.chainId);
    }

    const account = await _getAccountForNetwork({ isSyscoinChain, network });

    return account;
  }

  /** end */

  /** create/forget wallet */

  const createMainWallet = async (): Promise<IKeyringAccountState> => {
    const { hd: _hd, main: _main } = MainSigner({
      walletMnemonic: _mnemonic,
      isTestnet: wallet.activeNetwork.isTestnet,
      network: wallet.activeNetwork.url,
      blockbookURL: wallet.activeNetwork.url
    });

    hd = _hd;
    main = _main;

    storage.set('signers', { _hd, _main });

    const xprv = getEncryptedXprv();

    storage.set('signers', { _hd, _main });

    const createdAccount = await getLatestUpdateForAccount();

    console.log(
      '[create] getting created account',
      createdAccount,
      createdAccount.address
    );

    const account: IKeyringAccountState = _getInitialAccountData({
      signer: main,
      createdAccount,
      xprv,
    });

    hd && hd.setAccountIndex(account.id);

    return account;
  };

  const getSeed = (pwd: string) => (checkPassword(pwd) ? hd.mnemonic : null);

  const hasHdMnemonic = () => Boolean(hd.mnemonic);

  const forgetSigners = () => {
    hd = {} as SyscoinHDSigner;
    main = {} as SyscoinMainSigner;

    storage.set('signers', { _hd: null, _main: null });
  }

  const setAccountIndexForDerivedAccount = (accountId: number) => {
    const childAccount = hd.deriveAccount(accountId);

    const derivedAccount = new fromZPrv(
      childAccount,
      hd.Signer.pubTypes,
      hd.Signer.networks
    );

    hd.Signer.accounts.push(derivedAccount);
    hd.setAccountIndex(accountId);
  }

  /** end */

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
    txs,
    trezor,
    createMainWallet,
    getAccountXpub,
    getLatestUpdateForAccount,
    setSignerNetwork,
    getSeed,
    hasHdMnemonic,
    forgetSigners,
    setAccountIndexForDerivedAccount,
  };
};
