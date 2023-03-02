import axios from 'axios';
import { generateMnemonic, validateMnemonic, mnemonicToSeed } from 'bip39';
import { fromZPrv } from 'bip84';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { hdkey } from 'ethereumjs-wallet';
import sys from 'syscoinjs-lib';
import {
  IEthereumTransactions,
  IKeyringAccountState,
  IKeyringBalances,
  ISyscoinTransactions,
  IWalletState,
} from 'types';

import { Web3Accounts } from './eth-manager';
import { initialWalletState } from './initial-state';
import { EthereumTransactions, SyscoinTransactions } from './transactions';
import * as sysweb3 from '@pollum-io/sysweb3-core';
import {
  getSysRpc,
  jsonRpcRequest,
  setActiveNetwork,
  validateSysRpc,
} from '@pollum-io/sysweb3-network';
import {
  getAsset,
  getDecryptedVault,
  getSigners,
  IEthereumNftDetails,
  INetwork,
  setEncryptedVault,
  SyscoinHDSigner,
} from '@pollum-io/sysweb3-utils';

const ACCOUNT_ZERO = 0;
const SYSCOIN_CHAIN = 'syscoin';

export interface ISysAccount {
  xprv?: string;
  xpub: string;
  balances: IKeyringBalances;
  transactions: [];
  assets?: [];
  address: string;
  label?: string;
}

export interface ISysAccountWithId extends ISysAccount {
  id: number;
}

export class NewKeyringManager {
  private hash: string;
  private salt: string;
  private xprv: string;
  private xpub: string;
  private address: string;

  web3Wallet: any; //todo type
  storage: any; //todo type
  wallet: IWalletState;

  //local variables
  hd: SyscoinHDSigner;
  memMnemonic: string;
  memPassword: string;
  actualPassword: string;

  //transactions objects
  ethereumTransaction: IEthereumTransactions;
  syscoinTransaction: ISyscoinTransactions;

  constructor() {
    this.web3Wallet = Web3Accounts();
    this.storage = sysweb3.sysweb3Di.getStateStorageDb();
    this.wallet = initialWalletState;
    this.hd = new sys.utils.HDSigner('');

    this.hash = '';
    this.salt = this.generateSalt();
    this.memMnemonic = '';
    this.memPassword = '';
    this.actualPassword = '';
    this.xprv = '';
    this.xpub = '';
    this.address = '';

    this.ethereumTransaction = EthereumTransactions();
    this.syscoinTransaction = SyscoinTransactions();
  }

  /**
   * PUBLIC METHODS
   */

  public addNewAccount = async (label?: string) => {
    const { network, mnemonic } = getDecryptedVault();

    const isSyscoinChain = this.isSyscoinChain(network);

    if (isSyscoinChain) {
      return this.addNewAccountToSyscoinChain(network, label);
    }

    if (!mnemonic) {
      throw new Error('Seed phrase is required to create a new account.');
    }

    return this.addNewAccountToEth(label);
  };

  public setWalletPassword = (pwd: string) => {
    const hash = this.encryptSHA512(pwd, this.salt);

    this.storage.set('vault-keys', { hash, salt: this.salt });

    if (this.memMnemonic && this.hash) {
      setEncryptedVault({
        wallet: this.wallet,
        network: this.wallet.activeNetwork,
        mnemonic: CryptoJS.AES.encrypt(this.memMnemonic, hash).toString(),
      });
    }
  };

  public checkPassword = (password: string): boolean => {
    const { hash, salt } = this.storage.get('vault-keys');

    const hashPassword = this.encryptSHA512(password, salt);

    if (hashPassword === hash) {
      this.actualPassword = password;
    }
    return hashPassword === hash;
  };

  public createKeyringVault = async (): Promise<IKeyringAccountState> => {
    const { hash } = this.storage.get('vault-keys');

    const encryptedMnemonic = CryptoJS.AES.encrypt(
      this.memMnemonic,
      hash
    ).toString();

    const vault = await this.createMainWallet();

    this.wallet = {
      ...initialWalletState,
      ...this.wallet,
      accounts: {
        ...this.wallet.accounts,
        [vault.id]: vault,
      },
      activeAccount: vault,
    };

    setEncryptedVault({
      ...getDecryptedVault(),
      wallet: this.wallet,
      network: this.wallet.activeNetwork,
      mnemonic: encryptedMnemonic,
      lastLogin: 0,
    });

    return vault;
  };

  public setActiveAccount = async (accountId: number) => {
    const { wallet: _wallet } = getDecryptedVault();

    this.wallet = {
      ..._wallet,
      activeAccount: accountId,
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });
  };

  public getAccountById = (id: number): IKeyringAccountState => {
    const accounts = Object.values(this.wallet.accounts);

    const account = accounts.find((account) => account.id === id);

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  };

  public getPrivateKeyByAccountId = (id: number): string => {
    const account = Object.values(this.wallet.accounts).find(
      (account) => account.id === id
    );

    if (!account) {
      throw new Error('Account not found');
    }

    return account.xprv;
  };

  public getEncryptedXprv = () =>
    CryptoJS.AES.encrypt(
      this.getEncryptedPrivateKeyFromHd(),
      this.hash
    ).toString();

  public getSeed = (pwd: string) => {
    if (!this.checkPassword(pwd)) {
      throw new Error('Invalid password.');
    }

    return this.getDecryptedMnemonic();
  };

  public getLatestUpdateForAccount = async () => {
    const vault = getDecryptedVault();

    this.wallet = vault.wallet;

    setEncryptedVault({ ...vault, wallet: this.wallet });

    const isSyscoinChain =
      Boolean(
        this.wallet.networks.syscoin[this.wallet.activeNetwork.chainId]
      ) && this.wallet.activeNetwork.url.includes('blockbook');

    const latestUpdate = isSyscoinChain
      ? await this.getLatestUpdateForSysAccount()
      : await this.getLatestUpdateForWeb3Accounts();

    const { wallet: _updatedWallet } = getDecryptedVault();

    return {
      accountLatestUpdate: latestUpdate,
      walleAccountstLatestUpdate: _updatedWallet.accounts,
    };
  };

  // todo: ask why do we need to return account on setting signer network
  public setSignerNetwork = async (
    network: INetwork,
    chain: string
  ): Promise<IKeyringAccountState> => {
    const { wallet: _wallet } = getDecryptedVault();

    const networksByChain = _wallet.networks[chain];

    this.wallet = {
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

    setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });

    //todo: ask why do we need to call setSignerByChain twice?
    await this.setSignerByChain(network, chain);

    if (chain === 'syscoin') {
      const { rpc, isTestnet } = await this.setSignerByChain(network, chain);

      setEncryptedVault({ ...getDecryptedVault(), isTestnet, rpc });
    }

    const account = await this.getAccountForNetwork({
      isSyscoinChain: chain === 'syscoin',
    });

    this.wallet = {
      ...this.wallet,
      accounts: {
        ...this.wallet.accounts,
        [account.id]: account,
      },
      activeAccount: account,
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });

    return account;
  };

  public forgetMainWallet = (pwd: string) => {
    if (!this.checkPassword(pwd)) {
      throw new Error('Invalid password');
    }

    this.clearTemporaryLocalKeys();
  };

  public getAccountXpub = (): string => this.hd.getAccountXpub();
  public isSeedValid = (seedPhrase: string) => validateMnemonic(seedPhrase);
  public createSeed = () => this.setSeed(generateMnemonic());
  //todo: get state returns wallet, maybe we can improve this naming
  public getState = () => this.wallet;
  public getNetwork = () => this.wallet.activeNetwork;

  /**
   * PRIVATE METHODS
   */

  /**
   *
   * @param password
   * @param salt
   * @returns hash: string
   */
  private encryptSHA512 = (password: string, salt: string) => {
    this.hash = crypto
      .createHmac('sha512', salt)
      .update(password)
      .digest('hex');

    return this.hash;
  };

  private setSeed = (seedPhrase: string) => {
    if (validateMnemonic(seedPhrase)) {
      this.memMnemonic = seedPhrase;
      return seedPhrase;
    }
  };

  private createMainWallet = async (): Promise<IKeyringAccountState> => {
    const { _hd } = getSigners();

    this.hd = _hd;

    const xprv = this.getEncryptedXprv();
    const sysAccount = await this.getLatestUpdateForSysAccount();
    const account = this.getInitialAccountData({
      signer: _hd,
      sysAccount,
      xprv,
    });

    this.hd.setAccountIndex(account.id);

    return account;
  };

  private getEncryptedPrivateKeyFromHd = () =>
    this.hd.Signer.accounts[this.hd.Signer.accountIndex].getAccountPrivateKey();

  private getLatestUpdateForSysAccount = async (): Promise<ISysAccount> => {
    const { wallet: decryptedWallet, network, isTestnet } = getDecryptedVault();

    if (
      !this.hd.mnemonic ||
      this.hd.Signer.isTestnet !== isTestnet ||
      this.hd.blockbookURL !== network.url
    ) {
      const { _hd } = getSigners();

      this.hd = _hd;
    }

    const walletAccountsArray = Object.values(decryptedWallet.accounts);

    const { length } = this.hd.Signer.accounts;

    if (length > 1 || walletAccountsArray.length > 1) {
      for (const id in Object.values(decryptedWallet.accounts)) {
        if (!this.hd.Signer.accounts[Number(id)]) {
          this.addAccountToSigner(Number(id));
        }
      }
    }

    const accounts: ISysAccountWithId[] = decryptedWallet.accounts;

    for (const account of Object.values(accounts)) {
      await this.setDerivedSysAccounts(account.id);
    }

    if (this.hd && decryptedWallet.activeAccount.id > -1) {
      this.hd.setAccountIndex(decryptedWallet.activeAccount.id);
    }

    const xpub = this.getAccountXpub();

    const formattedBackendAccount = await this.getFormattedBackendAccount({
      url: network.url,
      xpub,
    });
    const address = await this.hd.getNewReceivingAddress(true);
    const label = decryptedWallet.activeAccount.label;
    return {
      label,
      address,
      ...formattedBackendAccount,
    };
  };

  private getInitialAccountData = ({
    label,
    signer,
    sysAccount,
    xprv,
  }: {
    label?: string;
    signer: any;
    sysAccount: ISysAccount;
    xprv: string;
  }) => {
    const { balances, address, xpub, transactions, assets } = sysAccount;

    return {
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
  };

  private addAccountToSigner = (accountId: number) => {
    if (accountId === 0) return;
    if (this.hd.Signer.accounts[accountId]) return;

    const childAccount = this.hd.deriveAccount(accountId);

    const derivedAccount = new fromZPrv(
      childAccount,
      this.hd.Signer.pubTypes,
      this.hd.Signer.networks
    );

    this.hd.Signer.accounts.push(derivedAccount);
  };

  private setDerivedSysAccounts = async (id: number) => {
    if (this.hd && id > -1) this.hd.setAccountIndex(id);

    this.xpub = this.hd.getAccountXpub();
    this.xprv = this.getEncryptedXprv();
    this.address = this.hd.getNewReceivingAddress(true);

    const basicAccountInfo = await this.getBasicSysAccountInfo(this.xpub, id);

    const createdAccount = {
      address: this.address,
      xprv: this.xprv,
      ...basicAccountInfo,
    };

    this.wallet = {
      ...getDecryptedVault().wallet,
      accounts: {
        ...getDecryptedVault().wallet.accounts,
        [id]: createdAccount,
      },
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });

    return createdAccount;
  };

  private getBasicSysAccountInfo = async (xpub: string, id: number) => {
    const { network } = getDecryptedVault();

    const formattedBackendAccount = await this.getFormattedBackendAccount({
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

  private getFormattedBackendAccount = async ({
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
            ? atob(details.pubData.desc) //todo replace atob
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

  //todo network type
  private async addNewAccountToSyscoinChain(network: any, label?: string) {
    if (!this.hd.mnemonic) {
      const { _hd } = getSigners();
      this.hd = _hd;
    }

    const id = this.hd.createAccount();
    const xpub = this.hd.getAccountXpub();
    const xprv = this.getEncryptedXprv();

    const formattedBackendAccount = await this.getFormattedBackendAccount({
      url: network.url,
      xpub,
    });

    const address = await this.hd.getNewReceivingAddress(true);

    const latestUpdate: ISysAccount = {
      address,
      ...formattedBackendAccount,
    };

    const account = this.getInitialAccountData({
      label,
      signer: this.hd,
      sysAccount: latestUpdate,
      xprv,
    });

    const { wallet: _wallet } = getDecryptedVault();

    this.wallet = {
      ..._wallet,
      accounts: {
        ..._wallet.accounts,
        [id]: account,
      },
      activeAccount: account,
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });

    return {
      ...account,
      id,
    };
  }

  private async addNewAccountToEth(label?: string) {
    const { wallet: _wallet } = getDecryptedVault();
    const { length } = Object.values(_wallet.accounts);
    const seed = await mnemonicToSeed(this.getDecryptedMnemonic());
    const privateRoot = hdkey.fromMasterSeed(seed);
    const derivedCurrentAccount = privateRoot.derivePath(
      `m/44'/60'/0'/0/${length}`
    );
    const newWallet = derivedCurrentAccount.getWallet();
    const address = newWallet.getAddressString();
    const xprv = newWallet.getPrivateKeyString();
    const xpub = newWallet.getPublicKeyString();

    const basicAccountInfo = await this.getBasicWeb3AccountInfo(
      address,
      length,
      label
    );

    const { hash } = this.storage.get('vault-keys');

    const createdAccount = {
      address,
      xpub,
      xprv: CryptoJS.AES.encrypt(xprv, hash).toString(),
      ...basicAccountInfo,
    };

    this.wallet = {
      ..._wallet,
      accounts: {
        ..._wallet.accounts,
        [createdAccount.id]: createdAccount,
      },
      activeAccount: createdAccount,
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });

    return createdAccount;
  }

  private getBasicWeb3AccountInfo = async (
    address: string,
    id: number,
    label?: string
  ) => {
    const { network } = getDecryptedVault();

    const balance = await this.web3Wallet.getBalance(address);

    const transactions = await this.web3Wallet.getUserTransactions(
      address,
      network
    );
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

  private getDecryptedMnemonic = () => {
    const { mnemonic } = getDecryptedVault();
    const { hash } = this.storage.get('vault-keys');

    return CryptoJS.AES.decrypt(mnemonic, hash).toString(CryptoJS.enc.Utf8);
  };

  private getLatestUpdateForWeb3Accounts = async () => {
    const { wallet: _wallet } = getDecryptedVault();

    for (const index in Object.values(_wallet.accounts)) {
      const id = Number(index);
      const label = _wallet.accounts[id].label;
      await this.setDerivedWeb3Accounts(id, label);
    }

    const { wallet: _updatedWallet } = getDecryptedVault();

    const { accounts, activeAccount } = _updatedWallet;

    if (accounts[activeAccount.id] !== activeAccount) {
      this.wallet = {
        ..._updatedWallet,
        activeAccount: accounts[activeAccount.id],
      };

      setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });
    }

    return getDecryptedVault().wallet.activeAccount;
  };

  private setDerivedWeb3Accounts = async (id: number, label: string) => {
    const seed = await mnemonicToSeed(this.getDecryptedMnemonic());
    const privateRoot = hdkey.fromMasterSeed(seed);
    const derivedCurrentAccount = privateRoot.derivePath(
      `m/44'/60'/0'/0/${String(id)}`
    );
    const newWallet = derivedCurrentAccount.getWallet();
    const address = newWallet.getAddressString();
    const xprv = newWallet.getPrivateKeyString();
    const xpub = newWallet.getPublicKeyString();

    const { hash } = this.storage.get('vault-keys');

    const basicAccountInfo = await this.getBasicWeb3AccountInfo(
      address,
      id,
      label
    );
    const createdAccount = {
      address,
      xpub,
      xprv: CryptoJS.AES.encrypt(xprv, hash).toString(),
      ...basicAccountInfo,
    };

    this.wallet = {
      ...getDecryptedVault().wallet,
      accounts: {
        ...getDecryptedVault().wallet.accounts,
        [id]: createdAccount,
      },
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });

    if (id === ACCOUNT_ZERO) {
      const { address, privateKey, publicKey } = this.web3Wallet.importAccount(
        this.getDecryptedMnemonic()
      );

      const basicAccountInfo = await this.getBasicWeb3AccountInfo(
        address,
        ACCOUNT_ZERO,
        label
      );
      const account = {
        xprv: CryptoJS.AES.encrypt(privateKey, hash).toString(),
        xpub: publicKey,
        address,
        ...basicAccountInfo,
      };

      this.wallet = {
        ...getDecryptedVault().wallet,
        accounts: {
          ...getDecryptedVault().wallet.accounts,
          [ACCOUNT_ZERO]: account,
        },
      };

      setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });

      return account;
    }

    return createdAccount;
  };

  private setSignerByChain = async (
    network: INetwork,
    chain: string
  ): Promise<{ rpc: any; isTestnet: boolean }> => {
    setEncryptedVault({
      ...getDecryptedVault(),
      network,
    });
    if (chain === SYSCOIN_CHAIN) {
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

  private getAccountForNetwork = async ({
    isSyscoinChain,
  }: {
    isSyscoinChain: boolean;
  }) => {
    const { network, wallet: _wallet } = getDecryptedVault();

    this.wallet = {
      ..._wallet,
      activeNetwork: network,
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });

    if (isSyscoinChain) {
      const vault = getDecryptedVault();

      setEncryptedVault({ ...vault, network });

      const { _hd } = getSigners();

      this.hd = _hd;

      const xprv = this.getEncryptedXprv();
      const updatedAccountInfo = await this.getLatestUpdateForSysAccount();
      const account = this.getInitialAccountData({
        label: updatedAccountInfo.label,
        signer: this.hd,
        sysAccount: updatedAccountInfo,
        xprv,
      });

      const {
        wallet: { activeAccount },
      } = vault;

      if (this.hd && activeAccount.id > -1)
        this.hd.setAccountIndex(activeAccount.id);

      return account;
    }

    //todo: a fn that return another one sounds a little bit weird to me
    return await this.getLatestUpdateForWeb3Accounts();
  };

  private clearTemporaryLocalKeys = () => {
    this.wallet = initialWalletState;

    setEncryptedVault({
      mnemonic: '',
      wallet: this.wallet,
      network: this.wallet.activeNetwork,
    });

    this.logout();
  };

  private logout = () => {
    this.hd = new sys.utils.HDSigner('');

    this.memPassword = '';
    this.memMnemonic = '';
  };

  private isSyscoinChain = (network: any) =>
    Boolean(this.wallet.networks.syscoin[network.chainId]) &&
    network.url.includes('blockbook');

  private generateSalt = () => crypto.randomBytes(16).toString('hex');
}
