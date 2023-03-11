import axios from 'axios';
import { generateMnemonic, validateMnemonic, mnemonicToSeed } from 'bip39';
import { fromZPrv } from 'bip84';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { hdkey } from 'ethereumjs-wallet';
import { ethers } from 'ethers';
import sys from 'syscoinjs-lib';

import {
  initialActiveImportedAccountState,
  initialWalletState,
} from './initial-state';
import { getSigners, SyscoinHDSigner } from './signers';
import { getDecryptedVault, setEncryptedVault } from './storage';
import { NewEthereumTransactions, SyscoinTransactions } from './transactions';
import {
  IAccountType,
  IKeyringAccountState,
  IKeyringBalances,
  ISyscoinTransactions,
  IWalletState,
  KeyringAccountType,
  NewIEthereumTransactions,
} from './types';
import * as sysweb3 from '@pollum-io/sysweb3-core/src'; //TODO: temp
import { getSysRpc } from '@pollum-io/sysweb3-network/src'; //TODO: temp
import {
  getAsset,
  IEthereumNftDetails,
  INetwork,
  INetworkType,
} from '@pollum-io/sysweb3-utils/src'; //TODO: temp

//todo: remove vault and add info in the constructor as OPTS

const ACCOUNT_ZERO = 0;

export interface IKeyringManagerOpts {
  activeNetwork?: INetwork;
}
//TODO: adjust _wallet
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

  private storage: any; //todo type
  private wallet: IWalletState; //todo change this name, we will use wallets for another const -> Maybe for defaultInitialState / defaultStartState;

  //local variables
  private hd: SyscoinHDSigner;
  private memMnemonic: string;
  memPassword: string;
  actualPassword: string;

  //transactions objects
  public ethereumTransaction: NewIEthereumTransactions;
  syscoinTransaction: ISyscoinTransactions;

  constructor() {
    this.storage = sysweb3.sysweb3Di.getStateStorageDb();
    this.wallet = initialWalletState; //todo change this name, we will use wallets for another const -> Maybe for defaultInitialState / defaultStartState;
    this.hd = new sys.utils.HDSigner('');

    this.hash = '';
    this.salt = this.generateSalt();
    this.memMnemonic = '';
    this.memPassword = '';
    this.actualPassword = '';
    this.xprv = '';
    this.xpub = '';
    this.address = '';

    this.syscoinTransaction = SyscoinTransactions();

    this.ethereumTransaction = new NewEthereumTransactions();
  }

  // ===================================== PUBLIC METHODS - KEYRING MANAGER FOR HD - SYS ALL ===================================== //
  public validateAccountType = (account: IKeyringAccountState) => {
    return account.isImported === true
      ? KeyringAccountType.Imported
      : KeyringAccountType.HDAccount;
  };

  public validateAndGetAccountsByType = (): IAccountType => {
    const {
      wallet: { accounts, activeAccountType },
    } = getDecryptedVault();

    return activeAccountType === KeyringAccountType.HDAccount
      ? accounts.hd_accounts
      : accounts.imported_accounts;
  };

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
        hd_accounts: {
          [vault.id]: vault,
        },
      },
      activeAccountId: vault.id,
      activeAccountType: this.validateAccountType(vault),
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

  //TODO: add function to set account by type as well
  public setActiveAccount = async (accountId: number) => {
    const { wallet: _wallet } = getDecryptedVault();

    const accountsByType = this.validateAndGetAccountsByType();

    this.wallet = {
      ..._wallet,
      activeAccountId: accountsByType[accountId].id,
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });
  };

  public getAccountById = (id: number): IKeyringAccountState => {
    const accounts = Object.values(this.validateAndGetAccountsByType());

    const account = accounts.find((account) => account.id === id);

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  };
  //TODO: add function to get account by type as well
  public getPrivateKeyByAccountId = (id: number): string => {
    const accounts = this.validateAndGetAccountsByType();

    const account = Object.values(accounts).find(
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
  ): Promise<IKeyringAccountState | undefined> => {
    if (INetworkType.Ethereum !== chain && INetworkType.Syscoin !== chain) {
      // TODO: change to better implementation
      throw new Error('Unsupported chain');
    }
    const networkChain =
      INetworkType.Ethereum === chain
        ? INetworkType.Ethereum
        : INetworkType.Syscoin; //TODO: change to better implementation

    console.log('Checking wallet on memory', this.wallet);
    console.log('Checking network being added', network);

    let rpc, isTestnet, account;
    if (chain === INetworkType.Syscoin) {
      const { rpc: _rpc, isTestnet: _isTestnet } = await this.setSignerUTXO(
        network
      );
      rpc = _rpc;
      isTestnet = _isTestnet;
      console.log('SYSCOIN_CHAIN: Check decryptedVault', getDecryptedVault());
      console.log('SYSCOIN_CHAIN: Check rpc', rpc);
      console.log('SYSCOIN_CHAIN: Check isTestnet', isTestnet);
      account = await this.setSyscoinAccount();
    } else if (chain === INetworkType.Ethereum) {
      await this.setSignerEVM(network);
      // account = this.getLatestUpdateForWeb3Accounts(network);
      account = this.getLatestUpdateForWeb3Accounts();
    }
    this.wallet.networks[networkChain][network.chainId] = network;
    this.wallet.activeNetwork = network;
    setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });
    console.log('this.wallet.activeNetwork after', this.wallet.activeNetwork);
    return account; //TODO: after end of refactor remove this
  };

  public forgetMainWallet = (pwd: string) => {
    if (!this.checkPassword(pwd)) {
      throw new Error('Invalid password');
    }

    this.clearTemporaryLocalKeys();
  };

  public importWeb3Account = (mnemonicOrPrivKey: string) => {
    if (ethers.utils.isHexString(mnemonicOrPrivKey)) {
      return new ethers.Wallet(mnemonicOrPrivKey);
    }

    const { privateKey } = ethers.Wallet.fromMnemonic(mnemonicOrPrivKey);

    const account = new ethers.Wallet(privateKey);

    return account;
  };

  public getAccountXpub = (): string => this.hd.getAccountXpub();
  public isSeedValid = (seedPhrase: string) => validateMnemonic(seedPhrase);
  public createNewSeed = () => generateMnemonic();
  public setSeed = (seedPhrase: string) => {
    if (validateMnemonic(seedPhrase)) {
      this.memMnemonic = seedPhrase;
      return seedPhrase;
    }
  };
  //todo: get state returns wallet, maybe we can improve this naming
  public getState = () => this.wallet;
  public getNetwork = () => this.wallet.activeNetwork;
  public createEthAccount = (privateKey: string) =>
    new ethers.Wallet(privateKey);

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

  private createMainWallet = async (): Promise<IKeyringAccountState> => {
    const { _hd } = getSigners();
    this.hd = _hd;

    const xprv = this.getEncryptedXprv();
    this.xprv = xprv;
    const sysAccount = await this.getLatestUpdateForSysAccount();
    const account = this.getInitialAccountData({
      signer: _hd,
      sysAccount,
      xprv,
    });

    this.hd.setAccountIndex(account.id);

    return account; //todo adjust types at _getInitialAccountData
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

    if (this.hd && decryptedWallet.activeAccountId > -1) {
      this.hd.setAccountIndex(decryptedWallet.activeAccountId);
    }

    const xpub = this.getAccountXpub();
    const formattedBackendAccount = await this.getFormattedBackendAccount({
      url: network.url,
      xpub,
    });
    const address = await this.hd.getNewReceivingAddress(true);
    const label = decryptedWallet.activeAccountId.label;
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
      isImported: false,
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
    this.address = await this.hd.getNewReceivingAddress(true);

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
        hd_accounts: {
          ...getDecryptedVault().wallet.accounts.hd_accounts,
          [id]: createdAccount,
        },
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
          let dataFinal;
          try {
            const { data } = await axios.get(description);
            dataFinal = data;
          } catch (e) {
            dataFinal = {
              image: null,
            };
          }
          image = dataFinal.image ? dataFinal.image : '';
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
        hd_accounts: {
          ..._wallet.accounts.hd_accounts,
          [id]: account,
        },
      },
      activeAccountId: account.id,
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
        hd_accounts: {
          ..._wallet.accounts.hd_accounts,
          [createdAccount.id]: createdAccount,
        },
      },
      activeAccountId: createdAccount.id,
    };

    setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });

    return createdAccount;
  }

  private getBasicWeb3AccountInfo = async (
    address: string,
    id: number,
    label?: string
  ) => {
    //TODO: completely remove transaction control logic from sysweb3
    const transactions = [] as ethers.providers.TransactionResponse[];

    const balance = await this.ethereumTransaction.getBalance(address); //TODO: get balance without calling ethTransactions

    const assets: IEthereumNftDetails[] = []; //TODO: remove assets from sysweb3

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
    const {
      wallet: { accounts, activeAccountId },
    } = getDecryptedVault();

    const accountTypeToReturn = this.validateAndGetAccountsByType();

    for (const index in Object.values(accounts.hd_accounts)) {
      const id = Number(index);

      const label = this.wallet.accounts.hd_accounts[id].label;

      await this.setDerivedWeb3Accounts(id, label);
    }

    await this.updateAllPrivateKeyAccounts();

    return accountTypeToReturn[activeAccountId]; //TODO: enhance this implementation
  };

  private setDerivedWeb3Accounts = async (id: number, label: string) => {
    const seed = await mnemonicToSeed(this.getDecryptedMnemonic());
    const privateRoot = hdkey.fromMasterSeed(seed);

    const derivedCurrentAccount = privateRoot.derivePath(
      `m/44'/60'/0'/0/${String(id)}`
    );
    //todo: bad naming newWallet
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
      isImported: false,
      ...basicAccountInfo,
    };

    this.wallet = {
      ...this.wallet,
      accounts: {
        ...this.wallet.accounts,
        [id]: createdAccount,
      },
    };

    return createdAccount;
  };

  private setSignerUTXO = async (
    network: INetwork
  ): Promise<{ rpc: any; isTestnet: boolean }> => {
    const { rpc, chain } = await getSysRpc(network);

    return {
      rpc,
      isTestnet: chain === 'test',
    };
  };

  private setSignerEVM = async (network: INetwork): Promise<void> => {
    // await jsonRpcRequest(network.url, 'eth_chainId');
    const web3Provider = new ethers.providers.JsonRpcProvider(network.url);
    const { chainId } = await web3Provider.getNetwork();
    if (network.chainId === chainId) {
      this.ethereumTransaction.setWeb3Provider(network); // If chain check was sucessfull we set it as default web3Provider
      return;
    }
    throw new Error(
      `SetSignerEVM: Wrong network information expected ${network.chainId} received ${chainId}`
    );
  };

  private setSyscoinAccount = async () => {
    throw new Error('Under development');
  };

  private getAccountForNetwork = async ({
    isSyscoinChain,
  }: {
    isSyscoinChain: boolean;
  }) => {
    // const { network, wallet: _wallet } = getDecryptedVault();

    // this.wallet = {
    //   ..._wallet,
    //   activeNetwork: network,
    // };

    // setEncryptedVault({ ...getDecryptedVault(), wallet: this.wallet });

    if (isSyscoinChain) {
      const vault = getDecryptedVault();

      // setEncryptedVault({ ...vault, network });

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
        wallet: { activeAccountId },
      } = vault;

      if (this.hd && activeAccountId > -1) {
        this.hd.setAccountIndex(activeAccountId);
      }

      return account;
    }

    //todo: a fn that return another one sounds a little bit weird to me
    // return await this.getLatestUpdateForWeb3Accounts();
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

  // ===================================== PRIVATE KEY ACCOUNTS METHODS - SIMPLE KEYRING ===================================== //
  private async _getLatestUpdateForPrivateKeyAccount(
    account: IKeyringAccountState
  ) {
    const balance = await this.ethereumTransaction.getBalance(account.address);

    const updatedAccount = {
      ...account,
      balances: {
        syscoin: 0,
        ethereum: balance,
      },
    } as IKeyringAccountState;

    return updatedAccount;
  }

  private async _getPrivateKeyAccountInfos(privKey: string, label?: string) {
    const {
      wallet: { accounts },
    } = getDecryptedVault();

    const { hash } = this.storage.get('vault-keys');

    //Validate if the private key value that we receive already starts with 0x or not
    const validatedPrivateKey =
      privKey.slice(0, 2) === '0x' ? privKey : `0x${privKey}`;

    const importedAccountValue =
      this.ethereumTransaction.importAccount(validatedPrivateKey);

    const { address, publicKey, privateKey } = importedAccountValue;

    //Validate if account already exists
    const accountAlreadyExists = Object.values(
      accounts as IKeyringAccountState[]
    ).some((account) => account.address === address);

    if (accountAlreadyExists)
      throw new Error(
        'Account already exists, try again with another Private Key.'
      );

    const ethereumBalance = await this.ethereumTransaction.getBalance(address);

    const newImportedAccountValues = {
      ...initialActiveImportedAccountState,
      address,
      label: label ? label : `Account ${Object.values(accounts).length + 1}`,
      id: Object.values(accounts).length,
      balances: {
        syscoin: 0,
        ethereum: ethereumBalance,
      },
      xprv: CryptoJS.AES.encrypt(privateKey, hash).toString(),
      xpub: publicKey,
      assets: {
        syscoin: [],
        ethereum: [],
      },
    } as IKeyringAccountState;

    this.wallet.accounts.imported_accounts = {
      ...this.wallet.accounts.imported_accounts,
      [newImportedAccountValues.id]: newImportedAccountValues,
    };

    return newImportedAccountValues;
  }

  public async handleImportAccountByPrivateKey(
    privKey: string,
    label?: string
  ) {
    const {
      wallet: { accounts },
    } = getDecryptedVault();

    const importedAccountValue = await this._getPrivateKeyAccountInfos(
      privKey,
      label
    );

    const newWalletState = {
      ...getDecryptedVault().wallet,
      activeAccountId: importedAccountValue.id,
      accounts: {
        ...accounts,
        imported_accounts: {
          ...accounts.imported_accounts,
          [importedAccountValue.id]: importedAccountValue,
        },
      },
    } as IWalletState;

    setEncryptedVault({ ...getDecryptedVault(), newWalletState });

    return importedAccountValue;
  }

  public async updateAllPrivateKeyAccounts() {
    const updatedWallets = await Promise.all(
      Object.values(this.wallet.accounts.imported_accounts).map(
        async (account) =>
          await this._getLatestUpdateForPrivateKeyAccount(account)
      )
    );

    this.wallet.accounts.imported_accounts = updatedWallets;
  }
}
