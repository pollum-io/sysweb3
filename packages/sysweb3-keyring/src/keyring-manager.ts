import SafeEventEmitter from '@metamask/safe-event-emitter';
import axios from 'axios';
import { generateMnemonic, validateMnemonic, mnemonicToSeed } from 'bip39';
import { fromZPrv } from 'bip84';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { hdkey } from 'ethereumjs-wallet';
import sys from 'syscoinjs-lib';

import { Web3Accounts } from './accounts';
import { SyscoinTransactions } from './transactions';
import { TrezorWallet } from './trezor';
import * as sysweb3 from '@pollum-io/sysweb3-core';
import { setActiveNetwork } from '@pollum-io/sysweb3-network';
import {
  IKeyringAccountState,
  IWalletState,
  initialWalletState,
  INetwork,
  getSigners,
  validateSysRpc,
  SyscoinHDSigner,
  SyscoinMainSigner,
  IKeyringBalances,
} from '@pollum-io/sysweb3-utils';

export const KeyringManager = () => {
  /** keys */
  const web3Wallet = Web3Accounts();
  const storage = sysweb3.sysweb3Di.getStateStorageDb();

  let wallet: IWalletState = initialWalletState;

  let hd: SyscoinHDSigner = new sys.utils.HDSigner('');
  let main: SyscoinMainSigner = new sys.SyscoinJSLib(
    hd,
    wallet.activeNetwork.url
  );

  const getSalt = () => crypto.randomBytes(16).toString('hex');

  const encryptSHA512 = (password: string, salt: string) => {
    const hash = crypto.createHmac('sha512', salt);

    hash.update(password);

    return {
      salt,
      hash: hash.digest('hex'),
    };
  };

  const setWalletPassword = (pwd: string) => {
    const salt = getSalt();

    const saltHashPassword = encryptSHA512(pwd, salt);

    const { hash, salt: passwordSalt } = saltHashPassword;

    storage.set('vault', {
      ...storage.get('vault'),
      hash,
      salt: passwordSalt,
    });
  };

  const hasHdMnemonic = () => Boolean(hd.mnemonic);

  const forgetSigners = () => {
    hd = new sys.utils.HDSigner('');
    main = new sys.SyscoinJSLib(hd, wallet.activeNetwork.url);
  };
  /** end */

  /** validations */
  const checkPassword = (pwd: string) => {
    const { hash, salt } = storage.get('vault');

    const hashPassword = encryptSHA512(pwd, salt);

    return hashPassword.hash === hash;
  };

  const isUnlocked = () =>
    Boolean(hasHdMnemonic() && storage.get('vault').hash);
  /** end */

  /** seeds */
  const getEncryptedMnemonic = () => {
    const { mnemonic, hash } = storage.get('vault');

    const encryptedMnemonic = CryptoJS.AES.encrypt(mnemonic, hash);

    return String(encryptedMnemonic);
  };

  const getDecryptedMnemonic = () => storage.get('vault').mnemonic;

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

  /** end */

  /** controllers */
  const trezor = TrezorWallet();
  const txs = SyscoinTransactions();
  /** end */

  /** private */
  const _clearWallet = () => {
    wallet = initialWalletState;

    storage.set('vault', { ...storage.get('vault'), wallet });
  };

  const _clearTemporaryLocalKeys = () => {
    storage.set('vault', {
      ...storage.get('vault'),
      mnemonic: '',
      network: wallet.activeNetwork,
      salt: '',
      hash: '',
    });
  };

  const _persistWallet = (
    password: string = storage.get('vault').hash
  ): string | Error => {
    if (typeof password !== 'string') {
      return new Error('KeyringManager - password is not a string');
    }

    storage.set('vault', { ...storage.get('vault'), hash: password });

    return storage.get('vault').wallet;
  };

  const _notifyUpdate = () => {
    const eventEmitter = new SafeEventEmitter();

    eventEmitter.emit('update', storage.get('vault'));
  };

  const _fullUpdate = () => {
    _persistWallet(storage.get('vault').hash);

    storage.set('vault', { ...storage.get('vault'), wallet });

    _notifyUpdate();
  };

  const _updateUnlocked = () => {
    const eventEmitter = new SafeEventEmitter();

    eventEmitter.emit('unlock');
  };

  const _unlockWallet = async (password: string) => {
    const vault = storage.get('vault');

    const { salt } = vault;

    const { hash, salt: _salt } = encryptSHA512(password, salt);

    if (!vault.wallet) {
      storage.get('vault', {
        ...vault,
        hash,
        salt: _salt,
      });

      throw new Error('Wallet not found');
    }

    _clearWallet();

    storage.set('vault', {
      ...vault,
      hash,
      salt: _salt,
      wallet: vault.wallet,
    });

    return vault.wallet;
  };

  const _createMainWallet = async (): Promise<IKeyringAccountState> => {
    storage.set('vault', {
      ...storage.get('vault'),
      network: wallet.activeNetwork,
    });

    const { _hd, _main } = getSigners();

    hd = _hd;
    main = _main;

    storage.set('vault', {
      ...storage.get('vault'),
      signers: { hd, main },
    });

    const xprv = getEncryptedXprv();

    const createdAccount = await _getLatestUpdateForSysAccount();

    const account: IKeyringAccountState = _getInitialAccountData({
      signer: _hd,
      createdAccount,
      xprv,
    });

    hd && hd.setAccountIndex(account.id);

    return account;
  };

  const _getEncryptedPrivateKeyFromHd = () =>
    hd.Signer.accounts[hd.Signer.accountIndex].getAccountPrivateKey();

  const _getLatestUpdateForWeb3Accounts = async () => {
    const { mnemonic, network } = storage.get('vault');

    const { address, privateKey } = web3Wallet.importAccount(mnemonic);
    const balance = await web3Wallet.getBalance(address);

    const { id } = wallet.activeAccount;

    const transactions = await web3Wallet.getUserTransactions(
      address,
      network.chainId === 1 ? 'homestead' : network.label.toLowerCase()
    );

    const {
      data: {
        id: tokenId,
        symbol,
        name,
        description: { en },
        image: { thumb },
        current_price: currentPrice,
        market_cap_rank: marketCapRank,
        links: { blockchain_site: blockchainSite },
      },
    } = await axios.get('https://api.coingecko.com/api/v3/coins/ethereum');

    return {
      assets: [
        {
          id: tokenId,
          name,
          symbol: String(symbol).toUpperCase(),
          decimals: 18,
          description: en,
          image: thumb,
          currentPrice,
          marketCapRank,
          explorerLink: blockchainSite[0],
        },
      ],
      id,
      isTrezorWallet: false,
      label: `Account ${id}`,
      transactions,
      trezorId: -1,
      xprv: privateKey,
      balances: {
        ethereum: balance,
        syscoin: 0,
      },
      xpub: address,
      address: address,
    };
  };

  const _getInitialAccountData = ({
    label,
    signer,
    createdAccount,
    xprv,
  }: {
    label?: string;
    signer: any;
    createdAccount: any;
    xprv: string;
  }) => {
    const { balances, receivingAddress, xpub, transactions, assets } =
      createdAccount;

    const account = {
      id: signer.Signer.accountIndex,
      label: label ? label : `Account ${signer.Signer.accountIndex + 1}`,
      balances,
      xpub,
      xprv,
      address: receivingAddress,
      isTrezorWallet: false,
      transactions,
      assets,
    };

    return account;
  };

  const _getAccountForNetwork = async ({
    isSyscoinChain,
  }: {
    isSyscoinChain: boolean;
  }) => {
    const { mnemonic, network, wallet: _wallet } = storage.get('vault');

    wallet = {
      ..._wallet,
      activeNetwork: network,
    };

    _fullUpdate();

    if (isSyscoinChain) {
      const { isTestnet } = await validateSysRpc(network.url);

      const vault = storage.get('vault');

      storage.set('vault', { ...vault, mnemonic, network, isTestnet });

      const { _hd, _main } = getSigners();

      hd = _hd;
      main = _main;

      const {
        signers: { hd: hdSignerFromStorage },
      } = storage.get('vault');

      const hdAccounts = hdSignerFromStorage.Signer.accounts;

      if (hdAccounts.length > 1) {
        for (const id in hdAccounts) {
          if (!hd.Signer.accounts[Number(id)]) {
            setAccountIndexForDerivedAccount(Number(id));
          }
        }
      }

      const xprv = getEncryptedXprv();

      const updatedAccountInfo = await _getLatestUpdateForSysAccount();

      const account = _getInitialAccountData({
        signer: hd,
        createdAccount: updatedAccountInfo,
        xprv,
      });

      hd &&
        wallet.activeAccount.id > -1 &&
        hd.setAccountIndex(wallet.activeAccount.id);

      return account;
    }

    return await _getLatestUpdateForWeb3Accounts();
  };

  const _getFormattedBackendAccount = async ({
    url,
    xpub,
  }: {
    url: string;
    xpub: string;
  }) => {
    const options = 'tokens=nonzero&details=txs';

    const { address, balance, transactions, tokensAsset } =
      await sys.utils.fetchBackendAccount(url, xpub, options, xpub);

    const latestAssets = tokensAsset ? tokensAsset.slice(0, 30) : [];
    const assets = latestAssets.map((token: any) => ({
      ...token,
      symbol: atob(token.symbol),
    }));

    return {
      transactions: transactions ? transactions.slice(0, 20) : [],
      assets,
      xpub: address,
      balances: {
        syscoin: balance / 1e8,
        ethereum: 0,
      },
    };
  };

  const _getLatestUpdateForSysAccount = async (): Promise<{
    xpub: string;
    balances: IKeyringBalances;
    transactions: any;
    assets: any;
    receivingAddress: string;
  }> => {
    const { wallet: _wallet } = storage.get('vault');

    if (!hd.mnemonic) {
      const { _hd, _main } = getSigners();

      hd = _hd;
      main = _main;
    }

    const {
      signers: { hd: _hd },
    } = storage.get('vault');

    const hdAccounts = _hd.Signer.accounts;

    if (hdAccounts.length > 1) {
      for (const id in hdAccounts) {
        if (!hd.Signer.accounts[Number(id)]) {
          setAccountIndexForDerivedAccount(Number(id));
        }
      }
    }

    hd &&
      _wallet.activeAccount.id > -1 &&
      hd.setAccountIndex(_wallet.activeAccount.id);

    const xpub = hd.getAccountXpub();
    const formattedBackendAccount = await _getFormattedBackendAccount({
      url: main.blockbookURL || wallet.activeNetwork.url,
      xpub,
    });
    const receivingAddress = await hd.getNewReceivingAddress(true);

    return {
      receivingAddress,
      ...formattedBackendAccount,
    };
  };
  /** end */

  /** keyring */
  const createSeed = () => {
    const signers = storage.get('vault');
    const salt = getSalt();

    if (!signers.mnemonic)
      storage.set('vault', {
        ...signers,
        mnemonic: encryptSHA512(generateMnemonic(), salt),
      });

    return storage.get('vault').mnemonic;
  };

  const createKeyringVault = async (): Promise<IKeyringAccountState> => {
    _clearWallet();

    const vault = await _createMainWallet();

    wallet = {
      ...wallet,
      accounts: {
        ...wallet.accounts,
        [vault.id]: vault,
      },
      activeAccount: vault,
    };

    storage.set('vault', { ...storage.get('vault'), wallet });

    _fullUpdate();

    return vault;
  };

  /** login/logout */
  const login = async (
    password: string
  ): Promise<IKeyringAccountState | Error> => {
    if (!checkPassword(password)) return new Error('Invalid password');

    wallet = await _unlockWallet(password);

    _updateUnlocked();
    _notifyUpdate();

    storage.set('vault', { ...storage.get('vault'), wallet });

    await getLatestUpdateForAccount();

    setAccountIndexForDerivedAccount(wallet.activeAccount.id);

    return wallet.activeAccount;
  };

  const logout = () => {
    const eventEmitter = new SafeEventEmitter();

    forgetSigners();

    eventEmitter.emit('lock');

    _notifyUpdate();
  };
  /** end */

  const removeAccount = (accountId: number) => {
    delete wallet.accounts[accountId];
  };

  const signMessage = (
    msgParams: { accountId: number; data: string },
    opts?: any
  ): void => {
    const account = getAccountById(msgParams.accountId);

    txs.signMessage(account, msgParams.data, opts);
  };

  const forgetMainWallet = (pwd: string) => {
    if (!checkPassword(pwd)) throw new Error('Invalid password');

    _clearTemporaryLocalKeys();

    forgetSigners();

    wallet = initialWalletState;

    _fullUpdate();
  };

  const getEncryptedXprv = () =>
    CryptoJS.AES.encrypt(
      _getEncryptedPrivateKeyFromHd(),
      storage.get('vault').hash
    ).toString();

  const validateSeed = (seedphrase: string) => {
    if (validateMnemonic(seedphrase)) {
      storage.set('vault', {
        ...storage.get('vault'),
        mnemonic: seedphrase,
      });

      return true;
    }

    return false;
  };

  /** get updates */
  const getLatestUpdateForAccount = async () => {
    const vault = storage.get('vault');

    wallet = vault.wallet;

    storage.set('vault', { ...vault, wallet });

    const isSyscoinChain = Boolean(
      wallet.networks.syscoin[wallet.activeNetwork.chainId]
    );

    const latestUpdate = isSyscoinChain
      ? await _getLatestUpdateForSysAccount()
      : await _getLatestUpdateForWeb3Accounts();

    return latestUpdate;
  };
  /** end */

  /** networks */
  const _setSignerByChain = async (network: INetwork, chain: string) => {
    storage.set('vault', {
      ...storage.get('vault'),
      mnemonic: storage.get('vault').mnemonic,
      network,
    });

    if (chain === 'syscoin') {
      const { isTestnet } = await validateSysRpc(network.url);

      storage.set('vault', { ...storage.get('vault'), isTestnet });

      return;
    }

    const newNetwork = wallet.networks.ethereum[network.chainId];

    if (!newNetwork) throw new Error('Network not found');

    setActiveNetwork(newNetwork);

    storage.set('vault', {
      ...storage.get('vault'),
      isTestnet: false,
    });
  };

  /** networks */
  const setSignerNetwork = async (
    network: INetwork,
    chain: string
  ): Promise<IKeyringAccountState> => {
    wallet = {
      ...wallet,
      networks: {
        ...wallet.networks,
        [chain]: {
          [network.chainId]: network,
        },
      },
      activeNetwork: network,
    };

    _fullUpdate();

    await _setSignerByChain(network, chain);

    const account = await _getAccountForNetwork({
      isSyscoinChain: chain === 'syscoin',
    });

    wallet = {
      ...wallet,
      accounts: {
        ...wallet.accounts,
        [account.id]: account,
      },
      activeAccount: account,
    };

    _fullUpdate();

    return account;
  };
  /** end */

  /** accounts */
  const setAccountIndexForDerivedAccount = (accountId: number) => {
    if (accountId === 0) return;

    const childAccount = hd.deriveAccount(accountId);

    const derivedAccount = new fromZPrv(
      childAccount,
      hd.Signer.pubTypes,
      hd.Signer.networks
    );

    hd.Signer.accounts.push(derivedAccount);
  };
  /** end */

  const addNewAccount = async (label: string) => {
    if (!hd.mnemonic) {
      const { _hd, _main } = getSigners();

      hd = _hd;
      main = _main;
    }

    const { network, mnemonic } = storage.get('vault');

    const isSyscoinChain = Boolean(wallet.networks.syscoin[network.chainId]);

    if (isSyscoinChain) {
      const id = hd.createAccount();

      const xpub = hd.getAccountXpub();

      storage.set('vault', {
        ...storage.get('vault'),
        signers: { hd, main },
      });

      const formattedBackendAccount = await _getFormattedBackendAccount({
        url: main.blockbookURL || wallet.activeNetwork.url,
        xpub,
      });
      const receivingAddress = await hd.getNewReceivingAddress(true);

      const latestUpdate = {
        receivingAddress,
        ...formattedBackendAccount,
      };

      const xprv = getEncryptedXprv();

      const account = _getInitialAccountData({
        label,
        signer: hd,
        createdAccount: latestUpdate,
        xprv,
      });

      const { wallet: _wallet } = storage.get('vault');

      wallet = {
        ..._wallet,
        accounts: {
          ..._wallet.accounts,
          [id]: account,
        },
        activeAccount: account,
      };

      storage.set('vault', { ...storage.get('vault'), wallet });

      return {
        ...account,
        id,
      };
    }

    if (!mnemonic) {
      throw new Error('Seed phrase is required to create a new account.');
    }

    const seed = await mnemonicToSeed(mnemonic);
    const hdWallet = hdkey.fromMasterSeed(seed);
    const masterNode = hdWallet.derivePath("m/44'/60'/0'/0");
    const masterExtendedPublicKey = masterNode.publicExtendedKey();
    const newAccount = hdkey.fromExtendedKey(String(masterExtendedPublicKey));

    const { accounts } = wallet;

    const length = Object.values(accounts).length;

    const node = newAccount.derivePath(`m/${length + 1}`);
    const nodeWallet = node.getWallet();
    const address = nodeWallet.getAddressString();

    const balance = await web3Wallet.getBalance(address);

    const xpub = newAccount.getWallet().getPublicKeyString();

    const createdAccount = {
      balances: {
        syscoin: 0,
        ethereum: balance,
      },
      address,
      xpub,
      transactions: [],
      assets: [],
      xprv: xpub,
    };

    const initialAccount = {
      id: length + 1,
      label: label ? label : `Account ${length + 1}`,
      isTrezorWallet: false,
      ...createdAccount,
    };

    const { wallet: _wallet } = storage.get('vault');

    wallet = {
      ..._wallet,
      accounts: {
        ..._wallet.accounts,
        [initialAccount.id]: initialAccount,
      },
      activeAccount: initialAccount,
    };

    storage.set('vault', { ...storage.get('vault'), wallet });

    return initialAccount;
  };

  const removeNetwork = (chain: string, chainId: number) => {
    // @ts-ignore
    delete wallet.networks[chain][chainId];
  };

  const setActiveAccount = async (accountId: number) => {
    const { wallet: _wallet } = storage.get('vault');

    wallet = {
      ..._wallet,
      activeAccount: _wallet.accounts[accountId],
    };

    storage.set('vault', { ...storage.get('vault'), wallet });
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
    getState,
    getNetwork,
    getPrivateKeyByAccountId,
    logout,
    login,
    getAccounts,
    removeAccount,
    signMessage,
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
    removeNetwork,
    setActiveAccount,
  };
};
