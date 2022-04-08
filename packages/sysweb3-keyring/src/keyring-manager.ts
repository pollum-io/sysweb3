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

  let wallet: IWalletState = initialWalletState;

  storage.set('signers-key', { mnemonic: '', network: wallet.activeNetwork });

  const checkPassword = (pwd) => {
    const isValid = storage.get('vault-key') === pwd;

    if (isValid) _password = pwd;

    return isValid;
  };

  const createSeed = () => {
    const signers = storage.get('signers-key');
    if (!signers.mnemonic) storage.set('signers-key', { ...signers, mnemonic: generateMnemonic() });

    return storage.get('signers-key').mnemonic;
  };

  const isUnlocked = () => Boolean(hasHdMnemonic() && _password);

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

  const controllersData = { mnemonic: storage.get('signers-key').mnemonic, wallet };

  const _trezorTxs = TrezorTransactions(controllersData);
  const trezor = TrezorWallet({ ...controllersData, tx: _trezorTxs });
  const txs = SyscoinTransactions(controllersData);

  /** end */

  const _memStore = new ObservableStore<{
    isUnlocked: boolean;
    wallet: IWalletState;
  }>({
    isUnlocked: Boolean(_password && storage.get('signers-key').mnemonic && hasHdMnemonic()),
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
    storage.set('vault-key', pwd);
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
    if (!checkPassword(password)) return new Error('Invalid password');

    wallet = await _unlockWallet(password);

    _clearTemporaryLocalKeys();
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

    storage.set('signers-key', { mnemonic: storage.get('signers-key').mnemonic, network })

    console.log('[changing network keyring] full update', wallet)

    return vault;
  };

  const _clearTemporaryLocalKeys = () => {
    storage.set('signers-key', { mnemonic: null, network: initialNetworksState })
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
    const { network, mnemonic } = storage.get('signers-key');

    const { hd: _hd, main: _main } = MainSigner({
      walletMnemonic: mnemonic,
      isTestnet: network.isTestnet,
      network: network.url,
      blockbookURL: network.isTestnet ? 'testnet' : 'main'
    });

    hd = _hd;
    main = _main;

    const { address, response } =
      await sys.utils.fetchBackendAccount(
        main.blockbookURL,
        'zpub6rowqhwXmUCV5Dem7TFFWQSisgK9NwbdkJDYMqBi7JoRHK8fd9Zobr4bdJPGhzGvniAhfrCAbNetRqSDsbTQBXPdN4qzyNv5B1SMsWVtin2',
        'tokens=nonzero&details=txs',
        true
      );

    const receivingAddress = await _hd.getNewReceivingAddress(true);

    console.log('[_getBackendAccountData] response', { hd, main, address, response });

    const transactions = {};

    return {
      receivingAddress,
      xpub: address,
      balance: response.balance / 1e8,
      transactions: {},
      assets: {},
    };
  };

  const _getLatestUpdateForWeb3Accounts = () => {
    console.log("_getLatestUpdateForWeb3Accounts");

    return {}
  }

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
    const isSyscoinChain = wallet.networks.syscoin[wallet.activeNetwork.chainId];

    if (isSyscoinChain) {
      return await _getBackendAccountData();
    }

    return await _getLatestUpdateForWeb3Accounts();
  };

  /** end */

  /** set/get networks */

  const _getAccountForNetwork = async ({ isSyscoinChain }: { isSyscoinChain: boolean }) => {
    const { network, mnemonic } = storage.get('signers-key');

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

      const updatedAccountInfo = await getLatestUpdateForAccount();

      console.log('[switch network] getting created account', updatedAccountInfo, updatedAccountInfo.address);

      const account = _getInitialAccountData({
        signer: main,
        createdAccount: updatedAccountInfo,
        xprv,
      });

      console.log('[switch network] got created account', updatedAccountInfo, updatedAccountInfo.address);

      hd && hd.setAccountIndex(account.id);

      storage.set('signers-key', { mnemonic, network });

      return account;
    }

    const web3Account = web3Wallet.importAccount(mnemonic);

    const balance = await web3Wallet.getBalance(web3Account.address);
    const nfts = await web3Wallet.getNftsByAddress(web3Account.address);
    const tokens = await web3Wallet.getTokens(web3Account.address);
    const txs = await web3Wallet.getUserTransactions(web3Account.address, 'rinkeby');

    console.log('response web3 fetch', { balance, nfts, tokens, txs, web3Account })

    const { id } = wallet.activeAccount;

    // {
    //     "blockNumber": "10451291",
    //     "timeStamp": "1649160293",
    //     "hash": "0x9cce7e6fec092bc89409fe897c8c50dc81735e46b946ef7a7a672e4f1bb26659",
    //     "nonce": "16492",
    //     "blockHash": "0xcff2e1032096a583f69aa8bfa649e44714f7d6983e09c31466d1b49fe46a54f6",
    //     "transactionIndex": "3",
    //     "from": "0x5ff40197c83c3a2705ba912333cf1a37ba249eb7",
    //     "to": "0xe0650698ca96904dee7e48ef95b8e733705aa487",
    //     "value": "100000000000000000",
    //     "gas": "168000",
    //     "gasPrice": "8000000352",
    //     "isError": "0",
    //     "txreceipt_status": "1",
    //     "input": "0x",
    //     "contractAddress": "",
    //     "cumulativeGasUsed": "1400248",
    //     "gasUsed": "21000",
    //     "confirmations": "14336"
    // }

    const transactions = {};

    if (txs) {
      for (const transaction of txs) {
        transactions[transaction.nonce] = transaction;
      }
    }

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
    } as IKeyringAccountState;
  }

  const setSignerNetwork = async (network: INetwork): Promise<IKeyringAccountState> => {
    const isSyscoinChain = Boolean(networks.syscoin[network.chainId]);

    if (!isSyscoinChain) {
      setActiveNetwork('ethereum', network.chainId);
    }

    storage.set('signers-key', { ...storage.get('signers-key'), network });

    const account = await _getAccountForNetwork({ isSyscoinChain, network });

    return account;
  }

  /** end */

  /** create/forget wallet */

  const createMainWallet = async (): Promise<IKeyringAccountState> => {
    const { mnemonic, network } = storage.get('signers-key');

    const { hd: _hd, main: _main } = MainSigner({
      walletMnemonic: mnemonic,
      isTestnet: network.isTestnet,
      network: network.url,
      blockbookURL: network.url
    });

    const hdsigner = Object.assign(_hd, Object.getPrototypeOf(_hd))
    const mainsigner = Object.assign(_main, Object.getPrototypeOf(_main))

    // console.log(Object.prototype(hdsigner))

    hd = hdsigner;
    main = mainsigner;

    storage.set('signers', { _hd: hdsigner, _main: mainsigner });

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

    storage.set('signers-key', { mnemonic: null, network: null });
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
    _getLatestUpdateForWeb3Accounts
  };
};
