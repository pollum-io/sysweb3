import SafeEventEmitter from '@metamask/safe-event-emitter';
import axios from 'axios';
import { generateMnemonic, validateMnemonic, mnemonicToSeed } from 'bip39';
import { fromZPrv } from 'bip84';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { hdkey } from 'ethereumjs-wallet';
import { ethers } from 'ethers';
import sys from 'syscoinjs-lib';

import { Web3Accounts } from './eth-manager';
import { initialWalletState } from './initial-state';
import { initialize } from './trezor';
import {
  IKeyringAccountState,
  IWalletState,
  IKeyringBalances,
  IKeyringManager,
} from './types';
import * as sysweb3 from '@pollum-io/sysweb3-core';
import {
  getSysRpc,
  jsonRpcRequest,
  setActiveNetwork,
  validateSysRpc,
} from '@pollum-io/sysweb3-network';
import {
  INetwork,
  getSigners,
  SyscoinHDSigner,
  setEncryptedVault,
  getDecryptedVault,
  getAsset,
  IEthereumNftDetails,
} from '@pollum-io/sysweb3-utils';

export const KeyringManager = (): IKeyringManager => {
  const web3Wallet = Web3Accounts();
  const storage = sysweb3.sysweb3Di.getStateStorageDb();

  let wallet: IWalletState = initialWalletState;

  let hd: SyscoinHDSigner = new sys.utils.HDSigner('');
  let memMnemonic = '';
  let memPassword = '';

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

    storage.set('vault-keys', { hash, salt: passwordSalt });

    memPassword = hash;

    wallet = initialWalletState;

    if (memMnemonic) {
      setEncryptedVault({
        wallet,
        network: wallet.activeNetwork,
        mnemonic: CryptoJS.AES.encrypt(memMnemonic, hash).toString(),
      });
    }
  };

  const isUnlocked = () => !!memPassword;

  const logout = () => {
    hd = new sys.utils.HDSigner('');

    memPassword = '';
    memMnemonic = '';
  };

  const checkPassword = (pwd: string) => {
    const { hash, salt } = storage.get('vault-keys');

    const hashPassword = encryptSHA512(pwd, salt);

    return hashPassword.hash === hash;
  };

  const getEncryptedMnemonic = () => getDecryptedVault().mnemonic;

  const getDecryptedMnemonic = () => {
    const { mnemonic } = getDecryptedVault();
    const { hash } = storage.get('vault-keys');

    return CryptoJS.AES.decrypt(mnemonic, hash).toString(CryptoJS.enc.Utf8);
  };

  const getSeed = (pwd: string) => {
    if (!checkPassword(pwd)) throw new Error('Invalid password.');

    return getDecryptedMnemonic();
  };

  const getState = () => wallet;
  const getNetwork = () => wallet.activeNetwork;
  const getAccounts = () => Object.values(wallet.accounts);

  const getPrivateKeyByAccountId = (id: number): string => {
    const account = Object.values(wallet.accounts).find(
      (account) => account.id === id
    );

    if (!account) throw new Error('Account not found');

    return account.xprv;
  };

  const getAccountXpub = (): string => hd.getAccountXpub();

  const getAccountById = (id: number): IKeyringAccountState => {
    const account = Object.values(wallet.accounts).find(
      (account) => account.id === id
    );

    if (!account) throw new Error('Account not found');

    return account;
  };

  const _clearWallet = () => {
    wallet = initialWalletState;

    const vault = storage.get('vault');

    const clearingObject = vault
      ? { ...getDecryptedVault(), wallet }
      : { wallet };

    setEncryptedVault(clearingObject);
  };

  const _clearTemporaryLocalKeys = () => {
    wallet = initialWalletState;

    setEncryptedVault({
      mnemonic: '',
      wallet,
      network: wallet.activeNetwork,
    });

    logout();
  };

  const _updateUnlocked = () => {
    const eventEmitter = new SafeEventEmitter();

    eventEmitter.emit('unlock');
  };

  const _unlockWallet = async (password: string) => {
    const vault = getDecryptedVault();

    const { salt } = storage.get('vault-keys');
    const { hash, salt: _salt } = encryptSHA512(password, salt);

    if (!vault.wallet) {
      storage.set('vault-keys', {
        hash,
        salt: _salt,
      });

      throw new Error('Wallet not found');
    }

    _clearWallet();

    storage.set('vault-keys', {
      hash,
      salt: _salt,
    });

    memPassword = hash;

    setEncryptedVault({
      ...vault,
      wallet: vault.wallet,
    });

    return vault.wallet;
  };

  const _createMainWallet = async (): Promise<IKeyringAccountState> => {
    const { _hd } = getSigners();

    hd = _hd;

    const xprv = getEncryptedXprv();
    const createdAccount = await _getLatestUpdateForSysAccount();
    const account = _getInitialAccountData({
      signer: _hd,
      createdAccount,
      xprv,
    });

    hd.setAccountIndex(account.id);

    return account;
  };

  const _getEncryptedPrivateKeyFromHd = () =>
    hd.Signer.accounts[hd.Signer.accountIndex].getAccountPrivateKey();

  const _getBasicWeb3AccountInfo = async (
    address: string,
    id: number,
    label?: string
  ) => {
    const { network } = getDecryptedVault();

    const balance = await web3Wallet.getBalance(address);

    const transactions = await web3Wallet.getUserTransactions(address, network);
    // const assets = await web3Wallet.getAssetsByAddress(address, network);
    const assets: IEthereumNftDetails[] = [];
    return {
      assets,
      id,
      isTrezorWallet: false,
      label: label ? label : `Account ${id + 1}`,
      balances: {
        syscoin: 0,
        ethereum: balance,
      },
      transactions,
    };
  };

  const _setDerivedWeb3Accounts = async (id: number) => {
    const seed = await mnemonicToSeed(getDecryptedMnemonic());

    const privateRoot = hdkey.fromMasterSeed(seed);

    const derivedCurrentAccount = privateRoot.derivePath(
      `m/44'/60'/0'/0/${String(id)}`
    );
    const newWallet = derivedCurrentAccount.getWallet();
    const checkSumAddress = newWallet.getAddressString();
    const address = ethers.utils.getAddress(checkSumAddress);
    const xprv = newWallet.getPrivateKeyString();
    const xpub = newWallet.getPublicKeyString();
    const { hash } = storage.get('vault-keys');
    const basicAccountInfo = await _getBasicWeb3AccountInfo(address, id);

    const createdAccount = {
      address,
      xpub,
      xprv: CryptoJS.AES.encrypt(xprv, hash).toString(),
      ...basicAccountInfo,
    };

    return createdAccount;
  };

  const _getLatestUpdateForWeb3Accounts = async () => {
    const { wallet: _wallet } = getDecryptedVault();

    for (const index in Object.values(_wallet.accounts)) {
      const id = Number(index);
      const createdAccount = await _setDerivedWeb3Accounts(id);

      wallet = {
        ...getDecryptedVault().wallet,
        accounts: {
          ...getDecryptedVault().wallet.accounts,
          [id]: createdAccount,
        },
        activeAccount: createdAccount,
      };

      setEncryptedVault({ ...getDecryptedVault(), wallet });
    }

    const { wallet: _updatedWallet } = getDecryptedVault();

    const { accounts, activeAccount } = _updatedWallet;

    if (accounts[activeAccount.id] !== activeAccount) {
      wallet = {
        ..._updatedWallet,
        activeAccount: accounts[activeAccount.id],
      };

      setEncryptedVault({ ...getDecryptedVault(), wallet });
    }

    return getDecryptedVault().wallet.activeAccount;
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
    const { balances, address, xpub, transactions, assets } = createdAccount;

    const account = {
      id: signer.Signer.accountIndex,
      label: label ? label : `Account ${signer.Signer.accountIndex + 1}`,
      balances,
      xpub,
      xprv,
      address,
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
    const { network, wallet: _wallet } = getDecryptedVault();

    wallet = {
      ..._wallet,
      activeNetwork: network,
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet });

    if (!isSyscoinChain) return await _getLatestUpdateForWeb3Accounts();

    const vault = getDecryptedVault();

    setEncryptedVault({ ...vault, network });

    const { _hd } = getSigners();

    hd = _hd;

    const xprv = getEncryptedXprv();
    const updatedAccountInfo = await _getLatestUpdateForSysAccount();
    const account = _getInitialAccountData({
      signer: hd,
      createdAccount: updatedAccountInfo,
      xprv,
    });

    const {
      wallet: { activeAccount },
    } = vault;

    if (hd && activeAccount.id > -1) hd.setAccountIndex(activeAccount.id);

    return account;
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

    const filteredAssets: any = [];

    await Promise.all(
      latestAssets.map(async (token: any) => {
        const details = await getAsset(url, token.assetGuid);

        const description =
          details && details.pubData && details.pubData.desc
            ? atob(details.pubData.desc)
            : '';

        let image = '';

        if (description.startsWith('https://ipfs.io/ipfs/')) {
          const { data } = await axios.get(description);
          image = data.image ? data.image : '';
        }
        const asset = {
          ...token,
          ...details,
          description,
          symbol: token.symbol ? atob(String(token.symbol)) : '',
          image,
          balance: Number(token.balance) / 10 ** Number(token.decimals),
        };

        if (!filteredAssets.includes(asset)) filteredAssets.push(asset);
      })
    );

    return {
      transactions: transactions ? transactions.slice(0, 20) : [],
      assets: filteredAssets,
      xpub: address,
      balances: {
        syscoin: balance / 1e8,
        ethereum: 0,
      },
    };
  };

  const _getBasicSysAccountInfo = async (xpub: string, id: number) => {
    const { network } = getDecryptedVault();

    const formattedBackendAccount = await _getFormattedBackendAccount({
      url: network.url,
      xpub,
    });

    return {
      id,
      isTrezorWallet: false,
      label: `Account ${Number(id) + 1}`,
      ...formattedBackendAccount,
    };
  };

  const _setDerivedSysAccounts = async (id: number) => {
    if (hd && id > -1) hd.setAccountIndex(id);

    const xpub = hd.getAccountXpub();
    const xprv = getEncryptedXprv();
    const address = await hd.getNewReceivingAddress(true);

    const basicAccountInfo = await _getBasicSysAccountInfo(xpub, id);

    const createdAccount = {
      address,
      xprv,
      ...basicAccountInfo,
    };

    wallet = {
      ...getDecryptedVault().wallet,
      accounts: {
        ...getDecryptedVault().wallet.accounts,
        [id]: createdAccount,
      },
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet });

    return createdAccount;
  };

  const _getLatestUpdateForSysAccount = async (): Promise<{
    xpub: string;
    balances: IKeyringBalances;
    transactions: any;
    assets: any;
    address: string;
    label: string;
  }> => {
    const { wallet: _wallet, network, isTestnet } = getDecryptedVault();

    if (
      !hd.mnemonic ||
      hd.Signer.isTestnet !== isTestnet ||
      hd.blockbookURL !== network.url
    ) {
      const { _hd } = getSigners();

      hd = _hd;
    }

    const walletAccountsArray = Object.values(_wallet.accounts);

    const { length } = hd.Signer.accounts;

    if (length > 1 || walletAccountsArray.length > 1) {
      for (const id in Object.values(_wallet.accounts)) {
        if (!hd.Signer.accounts[Number(id)]) {
          addAccountToSigner(Number(id));
        }
      }
    }

    for (const account of Object.values(_wallet.accounts)) {
      // @ts-ignore
      await _setDerivedSysAccounts(account.id);
    }

    if (hd && _wallet.activeAccount.id > -1)
      hd.setAccountIndex(_wallet.activeAccount.id);

    const xpub = getAccountXpub();
    const formattedBackendAccount = await _getFormattedBackendAccount({
      url: network.url,
      xpub,
    });
    const address = await hd.getNewReceivingAddress(true);
    const label = _wallet.activeAccount.label;
    return {
      label,
      address,
      ...formattedBackendAccount,
    };
  };

  const createSeed = () => {
    memMnemonic = generateMnemonic();

    return memMnemonic;
  };

  const createKeyringVault = async (): Promise<IKeyringAccountState> => {
    wallet = initialWalletState;

    const { hash } = storage.get('vault-keys');
    const encryptedMnemonic = CryptoJS.AES.encrypt(
      memMnemonic,
      hash
    ).toString();

    setEncryptedVault({
      ...getDecryptedVault(),
      wallet,
      network: wallet.activeNetwork,
      mnemonic: encryptedMnemonic,
    });

    const vault = await _createMainWallet();

    wallet = {
      ...wallet,
      accounts: {
        ...wallet.accounts,
        [vault.id]: vault,
      },
      activeAccount: vault,
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet, lastLogin: 0 });

    return vault;
  };

  const createHardwareWallet = async () => {
    await initialize();

    const trezorSigner = new sys.utils.TrezorSigner();

    const { _main } = getSigners();

    if (!hd.mnemonic) {
      const { _hd } = getSigners();

      hd = _hd;
    }

    await trezorSigner.createAccount();

    const createdAccount = await _getFormattedBackendAccount({
      url: _main.blockbookURL,
      xpub: hd.getAccountXpub(),
    });

    const address = await hd.getNewReceivingAddress(true);

    const account = _getInitialAccountData({
      label: `Trezor ${hd.Signer.accountIndex + 1}`,
      createdAccount: {
        address,
        isTrezorWallet: true,
        ...createdAccount,
      },
      xprv: getEncryptedXprv(),
      signer: hd,
    });

    const { wallet: _wallet } = getDecryptedVault();

    wallet = {
      ..._wallet,
      accounts: {
        ..._wallet.accounts,
        [account.id]: account,
      },
      activeAccount: account,
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet });

    return account;
  };

  const login = async (password: string): Promise<IKeyringAccountState> => {
    if (!checkPassword(password)) throw new Error('Invalid password');

    wallet = await _unlockWallet(password);

    _updateUnlocked();

    setEncryptedVault({ ...getDecryptedVault(), wallet, lastLogin: 0 });

    await getLatestUpdateForAccount();

    addAccountToSigner(wallet.activeAccount.id);

    return wallet.activeAccount;
  };

  const removeAccount = (accountId: number) => {
    delete wallet.accounts[accountId];
  };

  const forgetMainWallet = (pwd: string) => {
    if (!checkPassword(pwd)) throw new Error('Invalid password');

    _clearTemporaryLocalKeys();
  };

  const getEncryptedXprv = () =>
    CryptoJS.AES.encrypt(
      _getEncryptedPrivateKeyFromHd(),
      storage.get('vault-keys').hash
    ).toString();

  const validateSeed = (seedphrase: string) => {
    if (validateMnemonic(seedphrase)) {
      memMnemonic = seedphrase;

      return true;
    }

    return false;
  };

  const getDecryptedPrivateKey = (key: string) => {
    if (!checkPassword(key)) return '';

    const { wallet: _wallet } = getDecryptedVault();
    const { hash } = storage.get('vault-keys');

    const accountXprv = _wallet.activeAccount.xprv;

    return CryptoJS.AES.decrypt(accountXprv, hash).toString(CryptoJS.enc.Utf8);
  };

  /** get updates */
  const getLatestUpdateForAccount = async () => {
    const vault = getDecryptedVault();

    wallet = vault.wallet;

    setEncryptedVault({ ...vault, wallet });

    const isSyscoinChain =
      Boolean(wallet.networks.syscoin[wallet.activeNetwork.chainId]) &&
      wallet.activeNetwork.url.includes('blockbook');

    const latestUpdate = isSyscoinChain
      ? await _getLatestUpdateForSysAccount()
      : await _getLatestUpdateForWeb3Accounts();

    const { wallet: _updatedWallet } = getDecryptedVault();

    return {
      accountLatestUpdate: latestUpdate,
      walleAccountstLatestUpdate: _updatedWallet.accounts,
    };
  };

  const _setSignerByChain = async (
    network: INetwork,
    chain: string
  ): Promise<{ rpc: any; isTestnet: boolean }> => {
    setEncryptedVault({
      ...getDecryptedVault(),
      network,
    });
    if (chain === 'syscoin') {
      const response = await validateSysRpc(network.url);

      if (!response.valid) throw new Error('Invalid network');

      const rpc = network.default ? null : await getSysRpc(network);

      return {
        rpc,
        isTestnet: response.chain === 'test',
      };
    }
    const newNetwork =
      getDecryptedVault().wallet.networks.ethereum[network.chainId];

    if (!newNetwork) throw new Error('Network not found');

    await jsonRpcRequest(network.url, 'eth_chainId');

    setActiveNetwork(newNetwork);
    setEncryptedVault({
      ...getDecryptedVault(),
      isTestnet: false,
    });
    return {
      rpc: null,
      isTestnet: false,
    };
  };

  // const { wallet: _wallet } = getDecryptedVault();
  // const networksByChain = _wallet.networks[chain];
  // wallet = {
  //   ..._wallet,
  //   networks: {
  //     ..._wallet.networks,
  //     [chain]: {
  //       ...networksByChain,
  //       [network.chainId]: network,
  //     },
  //   },
  //   activeNetwork: network,
  // };

  // (0, sysweb3_utils_1.setEncryptedVault)({ ...getDecryptedVault(), wallet });
  // try {
  //   await _setSignerByChain(network, chain);
  //   if (chain === 'syscoin') {
  //     const { rpc, isTestnet } = await _setSignerByChain(network, chain);
  //     (0, sysweb3_utils_1.setEncryptedVault)({ ...getDecryptedVault(), isTestnet, rpc });
  //   }

  //   const account = await _getAccountForNetwork({
  //     isSyscoinChain: chain === 'syscoin',
  //   });

  //   wallet = {
  //     ...wallet,
  //     accounts: {
  //       ...wallet.accounts,
  //       [account.id]: account,
  //     },
  //     activeAccount: account,
  //   };
  //   (0, sysweb3_utils_1.setEncryptedVault)({ ...getDecryptedVault(), wallet });
  //   return account;
  // }
  // catch (error) {
  //   throw new Error(error);
  // }
  /** networks */
  const setSignerNetwork = async (
    network: INetwork,
    chain: string
  ): Promise<IKeyringAccountState> => {
    const { wallet: _wallet } = getDecryptedVault();

    const networksByChain = _wallet.networks[chain];

    wallet = {
      ..._wallet,
      networks: {
        ..._wallet.networks,
        [chain]: {
          ...networksByChain,
          [network.chainId]: network,
        },
      },
      activeNetwork: network,
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet });

    await _setSignerByChain(network, chain);

    if (chain === 'syscoin') {
      const { rpc, isTestnet } = await _setSignerByChain(network, chain);

      setEncryptedVault({ ...getDecryptedVault(), isTestnet, rpc });
    }

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

    setEncryptedVault({ ...getDecryptedVault(), wallet });

    return account;
  };

  const addAccountToSigner = (accountId: number) => {
    if (accountId === 0) return;
    if (hd.Signer.accounts[accountId]) return;

    const childAccount = hd.deriveAccount(accountId);

    const derivedAccount = new fromZPrv(
      childAccount,
      hd.Signer.pubTypes,
      hd.Signer.networks
    );

    hd.Signer.accounts.push(derivedAccount);
  };

  const addNewAccount = async (label?: string) => {
    const { network, mnemonic } = getDecryptedVault();

    const isSyscoinChain =
      Boolean(wallet.networks.syscoin[network.chainId]) &&
      network.url.includes('blockbook');

    if (isSyscoinChain) {
      if (!hd.mnemonic) {
        const { _hd } = getSigners();

        hd = _hd;
      }

      const id = hd.createAccount();
      const xpub = hd.getAccountXpub();
      const xprv = getEncryptedXprv();

      const formattedBackendAccount = await _getFormattedBackendAccount({
        url: network.url,
        xpub,
      });

      const address = await hd.getNewReceivingAddress(true);

      const latestUpdate = {
        address,
        ...formattedBackendAccount,
      };

      const account = _getInitialAccountData({
        label,
        signer: hd,
        createdAccount: latestUpdate,
        xprv,
      });

      const { wallet: _wallet } = getDecryptedVault();

      wallet = {
        ..._wallet,
        accounts: {
          ..._wallet.accounts,
          [id]: account,
        },
        activeAccount: account,
      };

      setEncryptedVault({ ...getDecryptedVault(), wallet });

      return {
        ...account,
        id,
      };
    }

    if (!mnemonic) {
      throw new Error('Seed phrase is required to create a new account.');
    }

    const { wallet: _wallet } = getDecryptedVault();
    const { length } = Object.values(_wallet.accounts);
    const seed = await mnemonicToSeed(mnemonic);
    const privateRoot = hdkey.fromMasterSeed(seed);
    const derivedCurrentAccount = privateRoot.derivePath(
      `m/44'/60'/0'/0/${length + 1}`
    );
    const newWallet = derivedCurrentAccount.getWallet();
    const address = newWallet.getAddressString();
    const xprv = newWallet.getPrivateKeyString();
    const xpub = newWallet.getPublicKeyString();

    const basicAccountInfo = await _getBasicWeb3AccountInfo(
      address,
      length,
      label
    );

    const { hash } = storage.get('vault-keys');

    const createdAccount = {
      address,
      xpub,
      xprv: CryptoJS.AES.encrypt(xprv, hash).toString(),
      ...basicAccountInfo,
    };

    wallet = {
      ..._wallet,
      accounts: {
        ..._wallet.accounts,
        [createdAccount.id]: createdAccount,
      },
      activeAccount: createdAccount,
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet });

    return createdAccount;
  };

  const removeNetwork = (chain: string, chainId: number) => {
    // @ts-ignore
    delete wallet.networks[chain][chainId];
  };

  const setActiveAccount = async (accountId: number) => {
    const { wallet: _wallet } = getDecryptedVault();

    wallet = {
      ..._wallet,
      activeAccount: _wallet.accounts[accountId],
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet });
  };

  return {
    addNewAccount,
    checkPassword,
    createKeyringVault,
    createSeed,
    forgetMainWallet,
    getAccounts,
    getAccountById,
    getAccountXpub,
    getDecryptedMnemonic,
    getDecryptedPrivateKey,
    getEncryptedMnemonic,
    getEncryptedXprv,
    getLatestUpdateForAccount,
    getNetwork,
    getPrivateKeyByAccountId,
    getSeed,
    getState,
    isUnlocked,
    login,
    logout,
    removeAccount,
    removeNetwork,
    addAccountToSigner,
    setActiveAccount,
    setSignerNetwork,
    setWalletPassword,
    trezor: {
      createHardwareWallet,
    },
    validateSeed,
  };
};
