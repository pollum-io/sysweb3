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
  ISyscoinTransaction,
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
  /** keys */
  const web3Wallet = Web3Accounts();
  const storage = sysweb3.sysweb3Di.getStateStorageDb();

  let _password = '';

  let hd: SyscoinHDSigner = {} as SyscoinHDSigner;
  let main: SyscoinMainSigner = {} as SyscoinMainSigner;

  let wallet: IWalletState = initialWalletState;

  storage.set('signers-key', { mnemonic: '', network: wallet.activeNetwork });
  storage.set('keyring', { wallet, isUnlocked: Boolean(_password && storage.get('signers-key').mnemonic && hasHdMnemonic()) });

  const forgetSigners = () => {
    hd = {} as SyscoinHDSigner;
    main = {} as SyscoinMainSigner;

    storage.set('signers-key', { mnemonic: null, network: null });
    storage.set('signers', { _hd: null, _main: null });
  }
  /** end */

  /** validations */
  const checkPassword = (pwd) => {
    const isValid = storage.get('vault-key') === pwd;

    if (isValid) _password = pwd;

    return isValid;
  };

  const isUnlocked = () => Boolean(hasHdMnemonic() && _password);
  /** end */

  /** seeds */
  const getEncryptedMnemonic = () => {
    const encryptedMnemonic = CryptoJS.AES.encrypt(storage.get('signers-key').mnemonic, _password);

    return String(encryptedMnemonic);
  };

  const getDecryptedMnemonic = () => {
    const decryptedMnemonic = CryptoJS.AES.decrypt(
      getEncryptedMnemonic(),
      _password
    ).toString();

    return decryptedMnemonic;
  };

  const getSeed = (pwd: string) => (checkPassword(pwd) ? hd.mnemonic : null);
  /** end */

  /** state */
  const getState = () => wallet;
  const getNetwork = () => wallet.activeNetwork;
  const getAccounts = () => Object.values(wallet.accounts);

  const getPrivateKeyByAccountId = (id: number): string | null => {
    const account = Object.values(wallet.accounts).find(
      (account: IKeyringAccountState) => account.id === id
    );

    return account ? account.xprv : null;
  };

  const getAccountXpub = (): string => hd.getAccountXpub();

  const getAccountById = (id: number): IKeyringAccountState =>
    Object.values(wallet.accounts).find((account) => account.id === id) ||
    ({} as IKeyringAccountState);

  const hasHdMnemonic = () => Boolean(hd.mnemonic);
  /** end */

  /** controllers */
  const controllersData = { mnemonic: storage.get('signers-key').mnemonic, wallet };

  const _trezorTxs = TrezorTransactions(controllersData);
  const trezor = TrezorWallet({ ...controllersData, tx: _trezorTxs });
  const txs = SyscoinTransactions(controllersData);
  /** end */

  /** private */
  const _clearWallet = () => {
    wallet = initialWalletState;

    _updateLocalStoreWallet();
  };

  const _clearTemporaryLocalKeys = () => {
    storage.set('signers-key', { mnemonic: null, network: initialNetworksState })
  };

  const _persistWallet = (password: string = _password): string | Error => {
    if (typeof password !== 'string') {
      return new Error('KeyringManager - password is not a string');
    }

    _password = password;

    const serializedWallet = JSON.stringify(wallet);

    /** set vault in storage so we can get back the state when logging in */
    storage.set('vault', serializedWallet);

    console.log('vault stored in our storage', storage.get('vault'));

    return serializedWallet;
  };

  const _updateLocalStoreWallet = () => {
    return storage.set('keyring', { ...storage.get('keyring'), wallet });
  };

  const _notifyUpdate = () => {
    const eventEmitter = new SafeEventEmitter();

    eventEmitter.emit('update', storage.get('keyring'));
  };

  const _fullUpdate = () => {
    _persistWallet(_password);
    _updateLocalStoreWallet();
    _notifyUpdate();
  };

  const _updateUnlocked = () => {
    const eventEmitter = new SafeEventEmitter();

    storage.set('keyring', { ...storage.get('keyring'), isUnlocked: true });
    eventEmitter.emit('unlock');
  };

  const _unlockWallet = async (password: string): Promise<IWalletState> => {
    const { wallet: _wallet } = storage.get('keyring');

    console.log('unlock wallet', _wallet);

    if (!_wallet) {
      _password = password;

      return {};
    }

    _clearWallet();

    wallet = _wallet;
    _password = password;

    _updateLocalStoreWallet();

    return _wallet;
  };

  const _createMainWallet = async (): Promise<IKeyringAccountState> => {
    const { mnemonic, network } = storage.get('signers-key');

    const { hd: _hd, main: _main } = MainSigner({
      walletMnemonic: mnemonic,
      isTestnet: network.isTestnet,
      network: network.url,
      blockbookURL: network.url
    });

    const hdsigner = Object.assign(_hd, Object.getPrototypeOf(_hd))
    const mainsigner = Object.assign(_main, Object.getPrototypeOf(_main))

    hd = hdsigner;
    main = mainsigner;

    storage.set('signers', { _hd: hdsigner, _main: mainsigner });

    const xprv = getEncryptedXprv();

    const createdAccount = await _getLatestUpdateForSysAccount();

    const account: IKeyringAccountState = _getInitialAccountData({
      signer: main,
      createdAccount,
      xprv,
    });

    hd && hd.setAccountIndex(account.id);

    return account;
  };

  const _getEncryptedPrivateKeyFromHd = () => hd.Signer.accounts[hd.Signer.accountIndex].getAccountPrivateKey();

  const _getLatestUpdateForWeb3Accounts = async () => {
    const { mnemonic } = storage.get('signers-key');

    const web3Account = web3Wallet.importAccount(mnemonic);
    const balance = await web3Wallet.getBalance(web3Account.address);

    const { id } = wallet.activeAccount;

    const transactions = {};

    return {
      ...web3Account,
      assets: {},
      id,
      isTrezorWallet: false,
      label: `Account ${id}`,
      transactions,
      trezorId: -1,
      xprv: '',
      balances: {
        ethereum: balance,
        syscoin: 0,
      },
      xpub: '',
    };
  }

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

  const _getAccountForNetwork = async ({ isSyscoinChain }: { isSyscoinChain: boolean }) => {
    const { mnemonic, network } = storage.get('signers-key');

    wallet = {
      ...wallet,
      activeNetwork: network,
    }

    console.log('[_getAccountForNetwork]', wallet, isSyscoinChain)

    _fullUpdate();

    if (isSyscoinChain) {
      const { hd: _hd, main: _main } = MainSigner({
        walletMnemonic: mnemonic,
        isTestnet: network.isTestnet,
        network: network.url,
        blockbookURL: network.url
      });

      const hdsigner = Object.assign(_hd, Object.getPrototypeOf(_hd))
      const mainsigner = Object.assign(_main, Object.getPrototypeOf(_main))

      hd = hdsigner;
      main = mainsigner;

      storage.set('signers', { _hd: hdsigner, _main: mainsigner });

      const xprv = getEncryptedXprv();

      const updatedAccountInfo = await _getLatestUpdateForSysAccount();

      const account = _getInitialAccountData({
        signer: main,
        createdAccount: updatedAccountInfo,
        xprv,
      });

      hd && hd.setAccountIndex(account.id);

      storage.set('signers-key', { mnemonic, network });

      return account;
    }

    return await _getLatestUpdateForWeb3Accounts();
  }

  const _getFormattedBackendAccount = async ({ url, xpub }) => {
    const options = 'tokens=nonzero&details=txs';

    const { address, balance, transactions, tokensAsset } = await sys.utils.fetchBackendAccount(url, xpub, options, xpub);

    const txs: ISyscoinTransaction = {};
    const assets = {};

    if (transactions) {
      for (const tx of transactions) {
        txs[tx.txid] = tx;
      }
    }

    if (tokensAsset) {
      for (const asset of tokensAsset) {
        assets[asset.assetGuid] = asset;
      }
    }

    return {
      transactions: txs,
      assets,
      xpub: address,
      balance: balance / 1e8,
    }
  }

  const _getLatestUpdateForSysAccount = async (): Promise<{
    xpub: string;
    balance: number;
    transactions: any;
    tokens: any;
    receivingAddress: string;
  }> => {
    const { network: { url, isTestnet }, mnemonic } = storage.get('signers-key');

    const { hd: _hd, main: _main } = MainSigner({
      walletMnemonic: mnemonic,
      isTestnet: isTestnet,
      network: isTestnet ? 'testnet' : 'main',
      blockbookURL: url
    });

    hd = _hd;
    main = _main;

    const xpub = _hd.getAccountXpub();

    const formattedBackendAccount = await _getFormattedBackendAccount({ url, xpub });

    const receivingAddress = await _hd.getNewReceivingAddress(true);

    console.log('[_getLatestUpdateForSysAccount] formattedBackendAccount', formattedBackendAccount);

    return {
      receivingAddress,
      ...formattedBackendAccount
    };
  };
  /** end */

  /** keyring */
  const setWalletPassword = (pwd: string) => {
    _password = pwd;

    storage.set('vault-key', pwd);
  };

  const createSeed = () => {
    const signers = storage.get('signers-key');

    if (!signers.mnemonic) storage.set('signers-key', { ...signers, mnemonic: generateMnemonic() });

    return storage.get('signers-key').mnemonic;
  };

  const createKeyringVault = async (): Promise<IKeyringAccountState> => {
    _clearWallet();

    const vault = await _createMainWallet();

    wallet = {
      ...wallet,
      accounts: {
        ...wallet.accounts,
        [vault.id]: vault
      },
      activeAccount: vault,
    }

    _fullUpdate();

    return vault;
  };

  /** login/logout */
  const login = async (password: string): Promise<IKeyringAccountState | Error> => {
    if (!checkPassword(password)) return new Error('Invalid password');

    wallet = await _unlockWallet(password);

    setAccountIndexForDerivedAccount(wallet.activeAccount.id)
    _clearTemporaryLocalKeys();
    _updateUnlocked();
    _notifyUpdate();
    _updateLocalStoreWallet();

    return wallet.activeAccount;
  };

  const logout = () => {
    const eventEmitter = new SafeEventEmitter();

    _clearTemporaryLocalKeys();

    storage.set('keyring', { ...storage.get('keyring'), isUnlocked: false })

    eventEmitter.emit('lock');

    _notifyUpdate();
  };
  /** end */

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

    storage.set('signers-key', { mnemonic: storage.get('signers-key').mnemonic, network })

    console.log('[changing network keyring] full update', wallet)

    return vault;
  };


  const forgetMainWallet = (pwd: string) => {
    if (checkPassword(pwd)) return new Error('Invalid password');

    _clearTemporaryLocalKeys();

    forgetSigners();

    wallet = initialWalletState;

    _fullUpdate();
  };

  const getEncryptedXprv = () =>
    CryptoJS.AES.encrypt(
      _getEncryptedPrivateKeyFromHd(),
      _password
    ).toString();

  const validateSeed = (seedphrase: string) => {
    if (validateMnemonic(seedphrase)) {
      storage.set('signers-key', { ...storage.get('signers-key'), mnemonic: seedphrase });

      return true;
    }

    return false;
  };

  /** get updates */
  const getLatestUpdateForAccount = async () => {
    const { wallet: _wallet } = storage.get('keyring');

    wallet = _wallet;

    _updateLocalStoreWallet();

    const isSyscoinChain = Boolean(networks.syscoin[wallet.activeNetwork.chainId]);

    const latestUpdate = isSyscoinChain ? (await _getLatestUpdateForSysAccount()) : (await _getLatestUpdateForWeb3Accounts());

    console.log('[getLatestUpdateForAccount] latest update', latestUpdate)

    return latestUpdate;
  };
  /** end */

  /** networks */
  const setSignerNetwork = async (network: INetwork): Promise<IKeyringAccountState> => {
    wallet = {
      ...wallet,
      activeNetwork: network,
    }

    _updateLocalStoreWallet();

    storage.set('signers-key', { ...storage.get('signers-key'), network })

    const isSyscoinChain = Boolean(networks.syscoin[network.chainId]);

    if (!isSyscoinChain) {
      setActiveNetwork('ethereum', network.chainId);
    }

    storage.set('signers-key', { ...storage.get('signers-key'), network });

    const account = await _getAccountForNetwork({ isSyscoinChain });

    return account;
  }
  /** end */

  /** accounts */
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

  const addNewAccount = async (label) => {
    const { mnemonic, network } = storage.get('signers-key');
    const { hd: _hd, main: _main } = (0, sysweb3_utils_1.MainSigner)({
      walletMnemonic: mnemonic,
      isTestnet: network.isTestnet,
      network: network.url,
      blockbookURL: network.url
    });

    const id = _hd.createAccount();

    const latestUpdate = await getLatestUpdateForAccount();

    const xprv = getEncryptedXprv();

    const account = _getInitialAccountData({
      label,
      signer: main,
      createdAccount: latestUpdate,
      xprv,
    });

    _hd.setAccountIndex(id);

    return {
      ...account,
      id,
    };
  }

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
    getAccountXpub,
    getLatestUpdateForAccount,
    setSignerNetwork,
    getSeed,
    hasHdMnemonic,
    forgetSigners,
    setAccountIndexForDerivedAccount,
    addNewAccount,
  };
};
