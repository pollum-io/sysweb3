import { generateMnemonic, validateMnemonic, mnemonicToSeed } from 'bip39';
import { fromZPrv } from 'bip84';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { hdkey } from 'ethereumjs-wallet';
import { ethers } from 'ethers';
import mapValues from 'lodash/mapValues';
import omit from 'lodash/omit';
import sys from 'syscoinjs-lib';

import {
  initialActiveImportedAccountState,
  initialActiveTrezorAccountState,
  initialWalletState,
} from './initial-state';
import {
  getSyscoinSigners,
  SyscoinHDSigner,
  SyscoinMainSigner,
} from './signers';
import { getDecryptedVault, setEncryptedVault } from './storage';
import { EthereumTransactions, SyscoinTransactions } from './transactions';
import { TrezorKeyring } from './trezor';
import {
  IKeyringAccountState,
  IKeyringBalances,
  ISyscoinTransactions,
  IWalletState,
  KeyringAccountType,
  IEthereumTransactions,
  IKeyringManager,
} from './types';
import * as sysweb3 from '@pollum-io/sysweb3-core';
import {
  BitcoinNetwork,
  getSysRpc,
  IPubTypes,
  INetwork,
  INetworkType,
} from '@pollum-io/sysweb3-network';

export interface ISysAccount {
  xprv?: string;
  xpub: string;
  balances: IKeyringBalances;
  address: string;
  label?: string;
}

export interface IkeyringManagerOpts {
  wallet: IWalletState;
  activeChain: INetworkType;
  password?: string;
}
export interface ISysAccountWithId extends ISysAccount {
  id: number;
}
const ethHdPath: Readonly<string> = "m/44'/60'/0'";
export class KeyringManager implements IKeyringManager {
  private storage: any; //todo type
  private wallet: IWalletState; //todo change this name, we will use wallets for another const -> Maybe for defaultInitialState / defaultStartState;

  //local variables
  private hd: SyscoinHDSigner | null;
  private syscoinSigner: SyscoinMainSigner | undefined;
  private trezorSigner: TrezorKeyring;
  private memMnemonic: string;
  private memPassword: string;
  public activeChain: INetworkType;
  public initialTrezorAccountState: IKeyringAccountState;

  //transactions objects
  public ethereumTransaction: IEthereumTransactions;
  public syscoinTransaction: ISyscoinTransactions;
  constructor(opts?: IkeyringManagerOpts | null) {
    this.storage = sysweb3.sysweb3Di.getStateStorageDb();
    if (opts) {
      this.wallet = opts.wallet;
      this.activeChain = opts.activeChain;
      if (opts.password) this.setWalletPassword(opts.password);
      this.hd = null;
    } else {
      this.wallet = initialWalletState;
      this.activeChain = INetworkType.Syscoin;
      this.hd = new sys.utils.HDSigner('');
    }
    this.memMnemonic = '';
    this.memPassword = ''; //Lock wallet in case opts.password has been provided
    this.initialTrezorAccountState = initialActiveTrezorAccountState;

    this.trezorSigner = new TrezorKeyring(this.getSigner);

    // this.syscoinTransaction = SyscoinTransactions();
    this.syscoinTransaction = new SyscoinTransactions(
      this.getNetwork,
      this.getSigner,
      this.getState
    );
    this.ethereumTransaction = new EthereumTransactions(
      this.getNetwork,
      this.getDecryptedPrivateKey
    );
  }
  // ===================================== AUXILIARY METHOD - FOR TRANSACTIONS CLASSES ===================================== //
  private getDecryptedPrivateKey = (): {
    address: string;
    decryptedPrivateKey: string;
  } => {
    if (!this.memPassword)
      throw new Error('Wallet is locked cant proceed with transaction');
    if (this.activeChain !== INetworkType.Ethereum)
      throw new Error('Switch to EVM chain');
    const { accounts, activeAccountId, activeAccountType } = this.wallet;

    const { xprv, address } = accounts[activeAccountType][activeAccountId];
    const decryptedPrivateKey = CryptoJS.AES.decrypt(
      xprv,
      this.memPassword
    ).toString(CryptoJS.enc.Utf8);

    return {
      address,
      decryptedPrivateKey,
    };
  };
  private getSigner = (): {
    hd: SyscoinHDSigner;
    main: any; //TODO: Type this following syscoinJSLib interface
  } => {
    if (!this.memPassword) {
      throw new Error('Wallet is locked cant proceed with transaction');
    }
    if (this.activeChain !== INetworkType.Syscoin) {
      throw new Error('Switch to UTXO chain');
    }
    if (!this.syscoinSigner || !this.hd) {
      throw new Error(
        'Wallet is not initialised yet call createKeyringVault first'
      );
    }

    return { hd: this.hd, main: this.syscoinSigner };
  };

  // ===================================== PUBLIC METHODS - KEYRING MANAGER FOR HD - SYS ALL ===================================== //

  public setStorage = (client: any) => this.storage.setClient(client);

  public validateAccountType = (account: IKeyringAccountState) => {
    return account.isImported === true
      ? KeyringAccountType.Imported
      : KeyringAccountType.HDAccount;
  };

  public isUnlocked = () => {
    return !!this.memPassword;
  };
  public lockWallet = () => {
    this.memPassword = '';
  };

  public addNewAccount = async (label?: string) => {
    const network = this.wallet.activeNetwork;
    const mnemonic = this.memMnemonic;
    const isSyscoinChain = this.isSyscoinChain(network);

    if (isSyscoinChain) {
      return this.addNewAccountToSyscoinChain(network, label);
    }

    if (!mnemonic) {
      throw new Error('Seed phrase is required to create a new account.');
    }

    return this.addNewAccountToEth(label);
  };

  public setWalletPassword = (pwd: string, prvPwd?: string) => {
    if (this.memPassword) {
      if (!prvPwd) {
        throw new Error('Previous password is required to change the password');
      }
      if (prvPwd !== this.memPassword) {
        throw new Error('Previous password is not correct');
      }
    }
    const salt = this.generateSalt();
    const hash = this.encryptSHA512(pwd, salt);
    this.memPassword = pwd;
    this.storage.set('vault-keys', { hash, salt });

    if (this.memMnemonic) {
      setEncryptedVault(
        {
          mnemonic: CryptoJS.AES.encrypt(this.memMnemonic, pwd).toString(),
        },
        this.memPassword
      );
    }
  };

  public unlock = async (password: string): Promise<boolean> => {
    const { hash, salt } = this.storage.get('vault-keys');

    const hashPassword = this.encryptSHA512(password, salt);

    if (hashPassword === hash) {
      this.memPassword = password;
      const hdCreated = this.hd ? true : false;
      if (!hdCreated || !this.memMnemonic) {
        await this.restoreWallet(hdCreated);
      }
    }
    return hashPassword === hash;
  };

  public getNewChangeAddress = async (): Promise<string> => {
    if (this.hd === null)
      throw new Error('HD not created yet, unlock or initialize wallet first');
    //Sysweb3 only allow segwit change addresses for now
    return await this.hd.getNewChangeAddress(true, 84);
  };
  public getChangeAddress = async (id: number): Promise<string> => {
    if (this.hd === null)
      throw new Error('HD not created yet, unlock or initialize wallet first');
    this.hd.setAccountIndex(id);
    const address = await this.hd.getNewChangeAddress(true);
    this.hd.setAccountIndex(this.wallet.activeAccountId);
    return address;
  };
  public updateReceivingAddress = async (): Promise<string> => {
    if (this.hd === null)
      throw new Error('HD not created yet, unlock or initialize wallet first');
    const address = await this.hd.getNewReceivingAddress(true, 84);
    this.wallet.accounts[KeyringAccountType.HDAccount][
      this.wallet.activeAccountId
    ].address = address;
    return address;
  };

  public createKeyringVault = async (): Promise<IKeyringAccountState> => {
    if (this.syscoinSigner) {
      throw new Error('Wallet is already initialised');
    }
    if (!this.memPassword) {
      throw new Error('Create a password first');
    }
    const encryptedMnemonic = CryptoJS.AES.encrypt(
      this.memMnemonic,
      this.memPassword
    ).toString();
    const rootAccount = await this.createMainWallet();
    this.wallet = {
      ...initialWalletState,
      ...this.wallet,
      accounts: {
        ...this.wallet.accounts,
        [KeyringAccountType.HDAccount]: {
          [rootAccount.id]: rootAccount,
        },
      },
      activeAccountId: rootAccount.id,
      activeAccountType: this.validateAccountType(rootAccount),
    };

    setEncryptedVault(
      {
        ...getDecryptedVault(this.memPassword),
        mnemonic: encryptedMnemonic,
      },
      this.memPassword
    );

    return rootAccount;
  };

  public setActiveAccount = async (
    accountId: number,
    accountType: KeyringAccountType
  ) => {
    if (!this.hd && this.activeChain === INetworkType.Syscoin)
      throw new Error(
        'Initialise wallet first, cant change accounts without an active HD'
      );
    if (accountType === KeyringAccountType.HDAccount && this.hd) {
      this.hd.setAccountIndex(accountId);
    }
    const accounts = this.wallet.accounts[accountType];
    if (!accounts[accountId].xpub) throw new Error('Account not set');
    this.wallet = {
      ...this.wallet,
      activeAccountId: accounts[accountId].id,
      activeAccountType: accountType,
    };
  };

  public getAccountById = (
    id: number,
    accountType: KeyringAccountType
  ): Omit<IKeyringAccountState, 'xprv'> => {
    const accounts = Object.values(this.wallet.accounts[accountType]);

    const account = accounts.find((account) => account.id === id);

    if (!account) {
      throw new Error('Account not found');
    }

    return omit(account, 'xprv');
  };

  public getPrivateKeyByAccountId = (
    id: number,
    acountType: KeyringAccountType,
    pwd: string
  ): string => {
    if (!this.memPassword) {
      throw new Error('Unlock wallet first');
    } else if (this.memPassword !== pwd) {
      throw new Error('Invalid password');
    }

    const accounts = this.wallet.accounts[acountType];

    const account = Object.values(accounts).find(
      (account) => account.id === id
    );

    if (!account) {
      throw new Error('Account not found');
    }
    const decryptedPrivateKey = CryptoJS.AES.decrypt(
      account.xprv,
      pwd
    ).toString(CryptoJS.enc.Utf8);

    return decryptedPrivateKey;
  };

  public getActiveAccount = (): {
    activeAccount: Omit<IKeyringAccountState, 'xprv'>;
    activeAccountType: KeyringAccountType;
  } => {
    const { accounts, activeAccountId, activeAccountType } = this.wallet;

    return {
      activeAccount: omit(accounts[activeAccountType][activeAccountId], 'xprv'),
      activeAccountType,
    };
  };

  public getEncryptedXprv = () =>
    CryptoJS.AES.encrypt(
      this.getSysActivePrivateKey(),
      this.memPassword
    ).toString();

  public getSeed = (pwd: string) => {
    if (!this.memPassword) {
      throw new Error('Unlock wallet first');
    } else if (this.memPassword !== pwd) {
      throw new Error('Invalid password');
    }

    return this.memMnemonic;
  };

  public updateNetworkConfig = async (
    data: INetwork,
    chainType: INetworkType
  ) => {
    if (
      chainType !== INetworkType.Syscoin &&
      chainType !== INetworkType.Ethereum
    ) {
      throw new Error('Invalid chain type');
    }
    if (!this.wallet.networks[chainType][data.chainId]) {
      throw new Error('Network does not exist');
    }
    this.wallet = {
      ...this.wallet,
      networks: {
        ...this.wallet.networks,
        [chainType]: {
          ...this.wallet.networks[chainType],
          [data.chainId]: data,
        },
      },
    };
  };

  public removeNetwork = async (chain: INetworkType, chainId: number) => {
    //TODO: test failure case to validate rollback;
    if (
      this.activeChain === chain &&
      this.wallet.activeNetwork.chainId === chainId
    ) {
      throw new Error('Cannot remove active network');
    }
    delete this.wallet.networks[chain][chainId];
  };
  public setSignerNetwork = async (
    network: INetwork,
    chain: string
  ): Promise<{
    sucess: boolean;
    wallet?: IWalletState;
    activeChain?: INetworkType;
  }> => {
    if (INetworkType.Ethereum !== chain && INetworkType.Syscoin !== chain) {
      throw new Error('Unsupported chain');
    }
    const networkChain: INetworkType =
      INetworkType.Ethereum === chain
        ? INetworkType.Ethereum
        : INetworkType.Syscoin;
    const prevWalletState = this.wallet;
    const prevActiveChainState = this.activeChain;
    const prevHDState = this.hd;
    const prevSyscoinSignerState = this.syscoinSigner;
    try {
      if (chain === INetworkType.Syscoin) {
        const { rpc, isTestnet } = await this.getSignerUTXO(network);
        await this.updateUTXOAccounts(rpc, isTestnet);
        if (!this.hd) throw new Error('Error initialising HD');
        this.hd.setAccountIndex(this.wallet.activeAccountId);
      } else if (chain === INetworkType.Ethereum) {
        await this.setSignerEVM(network);
        await this.updateWeb3Accounts();
      }

      this.wallet = {
        ...this.wallet,
        networks: {
          ...this.wallet.networks,
          [networkChain]: {
            ...this.wallet.networks[networkChain],
            [network.chainId]: network,
          },
        },
        activeNetwork: network,
      };
      this.wallet.activeNetwork = network;
      this.activeChain = networkChain;

      return {
        sucess: true,
        wallet: this.wallet,
        activeChain: this.activeChain,
      };
    } catch (err) {
      //Rollback to previous values
      console.error('Set Signer Network failed with', err);
      this.wallet = prevWalletState;
      this.activeChain = prevActiveChainState;
      if (this.activeChain === INetworkType.Ethereum) {
        this.ethereumTransaction.setWeb3Provider(this.wallet.activeNetwork);
      } else if (this.activeChain === INetworkType.Syscoin) {
        this.hd = prevHDState;
        this.syscoinSigner = prevSyscoinSignerState;
      }

      return { sucess: false };
    }
  };

  public forgetMainWallet = (pwd: string) => {
    if (!this.memPassword) {
      throw new Error('Unlock wallet first');
    } else if (this.memPassword !== pwd) {
      throw new Error('Invalid password');
    }

    this.clearTemporaryLocalKeys();
  };

  public importWeb3Account = (mnemonicOrPrivKey: string) => {
    if (ethers.utils.isHexString(mnemonicOrPrivKey)) {
      return new ethers.Wallet(mnemonicOrPrivKey);
    }

    const account = ethers.Wallet.fromMnemonic(mnemonicOrPrivKey);

    return account;
  };

  public getAccountXpub = (): string => {
    const { activeAccountId, activeAccountType } = this.wallet;
    const account = this.wallet.accounts[activeAccountType][activeAccountId];
    return account.xpub;
  };

  public isSeedValid = (seedPhrase: string) => validateMnemonic(seedPhrase);
  public createNewSeed = () => generateMnemonic();
  public setSeed = (seedPhrase: string) => {
    if (validateMnemonic(seedPhrase)) {
      this.memMnemonic = seedPhrase;
      return seedPhrase;
    }
    throw new Error('Invalid Seed');
  };

  public getState = () => this.wallet;
  public getUTXOState = () => {
    if (this.activeChain !== INetworkType.Syscoin) {
      throw new Error('Cannot get state in a ethereum network');
    }

    const utxOAccounts = mapValues(this.wallet.accounts.HDAccount, (value) =>
      omit(value, 'xprv')
    );

    return {
      ...this.wallet,
      accounts: {
        [KeyringAccountType.HDAccount]: utxOAccounts,
        [KeyringAccountType.Imported]: {},
        [KeyringAccountType.Trezor]: {},
      },
    };
  };
  public async importTrezorAccount(
    coin: string,
    slip44: string,
    index: string
  ) {
    const importedAccount = await this._createTrezorAccount(
      coin,
      slip44,
      index
    );
    this.wallet.accounts[KeyringAccountType.Trezor][importedAccount.id] =
      importedAccount;

    return importedAccount;
  }
  public getActiveUTXOAccountState = () => {
    return {
      ...this.wallet.accounts.HDAccount[this.wallet.activeAccountId],
      xprv: undefined,
    };
  };
  public getNetwork = () => this.wallet.activeNetwork;
  public verifyIfIsTestnet = () => {
    const { chainId } = this.wallet.activeNetwork;
    if (this.wallet.networks.syscoin[chainId] && this.hd) {
      return this.hd.Signer.isTestnet;
    }
    return undefined;
  };
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
  private encryptSHA512 = (password: string, salt: string) =>
    crypto.createHmac('sha512', salt).update(password).digest('hex');

  private createMainWallet = async (): Promise<IKeyringAccountState> => {
    this.hd = new sys.utils.HDSigner(
      this.memMnemonic,
      null,
      false,
      undefined,
      undefined,
      undefined,
      84
    ) as SyscoinHDSigner; //To understand better this look at: https://github.com/syscoin/syscoinjs-lib/blob/298fda26b26d7007f0c915a6f77626fb2d3c852f/utils.js#L894
    this.syscoinSigner = new sys.SyscoinJSLib(
      this.hd,
      this.wallet.activeNetwork.url
    );

    const xpub = this.hd.getAccountXpub();

    const formattedBackendAccount: ISysAccount =
      await this.getFormattedBackendAccount({
        url: this.wallet.activeNetwork.url,
        xpub,
        id: this.hd.Signer.accountIndex,
      });

    const account = this.getInitialAccountData({
      signer: this.hd,
      sysAccount: formattedBackendAccount,
      xprv: this.getEncryptedXprv(),
    });
    return account;
  };

  private getSysActivePrivateKey = () => {
    if (this.hd === null) throw new Error('No HD Signer');
    return this.hd.Signer.accounts[
      this.hd.Signer.accountIndex
    ].getAccountPrivateKey();
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
    const { balances, address, xpub } = sysAccount;

    return {
      id: signer.Signer.accountIndex,
      label: label ? label : `Account ${signer.Signer.accountIndex + 1}`,
      balances,
      xpub,
      xprv,
      address,
      isTrezorWallet: false,
      isImported: false,
    };
  };

  private addUTXOAccount = async (accountId: number): Promise<any> => {
    if (this.hd === null) throw new Error('No HD Signer');
    if (accountId !== 0 && !this.hd.Signer.accounts[accountId]) {
      //We must recreate the account if it doesn't exist at the signer
      const childAccount = this.hd.deriveAccount(accountId, 84);

      const derivedAccount = new fromZPrv(
        childAccount,
        this.hd.Signer.pubTypes,
        this.hd.Signer.networks
      );

      this.hd.Signer.accounts.push(derivedAccount);
      this.hd.setAccountIndex(accountId);
    }
    const xpub = this.hd.getAccountXpub();
    const xprv = this.getEncryptedXprv();

    const basicAccountInfo = await this.getBasicSysAccountInfo(xpub, accountId);

    const createdAccount = {
      xprv,
      isImported: false,
      ...basicAccountInfo,
    };
    this.wallet.accounts[KeyringAccountType.HDAccount][accountId] =
      createdAccount;
  };

  private getBasicSysAccountInfo = async (xpub: string, id: number) => {
    if (!this.syscoinSigner) throw new Error('No HD Signer');
    const label = this.wallet.accounts[KeyringAccountType.HDAccount][id].label;
    const formattedBackendAccount = await this.getFormattedBackendAccount({
      url: this.syscoinSigner.blockbookURL,
      xpub,
      id,
    });
    return {
      id,
      isTrezorWallet: false,
      label: label ? label : `Account ${Number(id) + 1}`,
      ...formattedBackendAccount,
    };
  };

  private async _createTrezorAccount(
    coin: string,
    slip44: string,
    index: string,
    label?: string
  ) {
    const { accounts, activeNetwork } = this.wallet;
    const { descriptor: xpub, balance } =
      await this.trezorSigner.getAccountInfo({ coin, slip44 });

    const address = await this.trezorSigner.getAddress({ coin, slip44, index });

    const accountAlreadyExists =
      Object.values(
        accounts[KeyringAccountType.Trezor] as IKeyringAccountState[]
      ).some((account) => account.address === address) ||
      Object.values(
        accounts[KeyringAccountType.HDAccount] as IKeyringAccountState[]
      ).some((account) => account.address === address) ||
      Object.values(
        accounts[KeyringAccountType.Imported] as IKeyringAccountState[]
      ).some((account) => account.address === address);

    if (accountAlreadyExists)
      throw new Error(
        'Account already exists, try again with another Private Key.'
      );
    if (!xpub || !balance || !address)
      throw new Error(
        'Something wrong happened. Please, try again or report it'
      );

    const id =
      Object.values(accounts[KeyringAccountType.Trezor]).length < 1
        ? 0
        : Object.values(accounts[KeyringAccountType.Trezor]).length;

    const updatedAccountInfo = this.getFormattedBackendAccount({
      url: this.wallet.activeNetwork.url,
      xpub,
      id,
    });
    const trezorAccount = {
      ...this.initialTrezorAccountState,
      ...updatedAccountInfo,
      address,
      originNetwork: activeNetwork,
      label: label ? label : `Trezor ${id + 1}`,
      id,
      xprv: '',
      xpub,
      assets: {
        syscoin: [],
        ethereum: [],
      },
    } as IKeyringAccountState;

    return trezorAccount;
  }

  private getFormattedBackendAccount = async ({
    url,
    xpub,
    id,
  }: {
    url: string;
    xpub: string;
    id: number;
  }): Promise<ISysAccount> => {
    if (this.hd === null) throw new Error('No HD Signer');
    const bipNum = 84; //TODO: we need to change this logic to use descriptors for now we only use bip84
    const options = 'tokens=used&details=tokens';
    let balance = 0,
      stealthAddr = '';
    try {
      const { balance: _balance, tokens } = await sys.utils.fetchBackendAccount(
        url,
        xpub,
        options,
        true
      );
      const { receivingIndex } = this.setLatestIndexesFromXPubTokens(tokens);
      balance = _balance;
      stealthAddr = this.hd.Signer.accounts[id].getAddress(
        receivingIndex,
        false,
        bipNum
      );
    } catch (e) {
      throw new Error(`Error fetching account from network ${url}: ${e}`);
    }
    return {
      address: stealthAddr,
      xpub: xpub,
      balances: {
        syscoin: balance / 1e8,
        ethereum: 0,
      },
    };
  };

  private setLatestIndexesFromXPubTokens = (tokens: any) => {
    let changeIndex = 0;
    let receivingIndex = 0;
    if (tokens) {
      tokens.forEach((token: any) => {
        if (!token.transfers || !token.path) {
          return;
        }
        const transfers = parseInt(token.transfers, 10);
        if (token.path && transfers > 0) {
          const splitPath = token.path.split('/');
          if (splitPath.length >= 6) {
            const change = parseInt(splitPath[4], 10);
            const index = parseInt(splitPath[5], 10);
            if (change === 1) {
              changeIndex = index + 1;
            }
            receivingIndex = index + 1;
          }
        }
      });
    }
    return { changeIndex, receivingIndex };
  };

  //todo network type
  private async addNewAccountToSyscoinChain(network: any, label?: string) {
    if (this.hd === null || !this.hd.mnemonic) {
      throw new Error(
        'Keyring Vault is not created, should call createKeyringVault first '
      );
    }

    const id = this.hd.createAccount(84);
    const xpub = this.hd.getAccountXpub();
    const xprv = this.getEncryptedXprv();

    const latestUpdate: ISysAccount = await this.getFormattedBackendAccount({
      url: network.url,
      xpub,
      id,
    });

    const account = this.getInitialAccountData({
      label,
      signer: this.hd,
      sysAccount: latestUpdate,
      xprv,
    });

    this.wallet = {
      ...this.wallet,
      accounts: {
        ...this.wallet.accounts,
        [KeyringAccountType.HDAccount]: {
          ...this.wallet.accounts[KeyringAccountType.HDAccount],
          [id]: account,
        },
      },
      activeAccountId: account.id,
    };

    return {
      ...account,
      id,
    };
  }

  private async addNewAccountToEth(label?: string) {
    const { length } = Object.values(
      this.wallet.accounts[KeyringAccountType.HDAccount]
    );
    const seed = await mnemonicToSeed(this.memMnemonic);
    const privateRoot = hdkey.fromMasterSeed(seed);
    const derivedCurrentAccount = privateRoot.derivePath(
      `${ethHdPath}/0/${length}`
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

    const createdAccount: IKeyringAccountState = {
      address,
      xpub,
      xprv: CryptoJS.AES.encrypt(xprv, this.memPassword).toString(),
      isImported: false,
      ...basicAccountInfo,
    };

    this.wallet = {
      ...this.wallet,
      accounts: {
        ...this.wallet.accounts,
        [KeyringAccountType.HDAccount]: {
          ...this.wallet.accounts[KeyringAccountType.HDAccount],
          [createdAccount.id]: createdAccount,
        },
      },
      activeAccountId: createdAccount.id,
    };

    return createdAccount;
  }

  private getBasicWeb3AccountInfo = async (
    address: string,
    id: number,
    label?: string
  ) => {
    const balance = await this.ethereumTransaction.getBalance(address);

    return {
      id,
      isTrezorWallet: false,
      label: label ? label : `Account ${id + 1}`,
      balances: {
        syscoin: 0,
        ethereum: balance,
      },
    };
  };

  private updateWeb3Accounts = async () => {
    const { accounts, activeAccountId, activeAccountType } = this.wallet;

    //Account of HDAccount is always initialized as it is required to create a network
    for (const index in Object.values(accounts[KeyringAccountType.HDAccount])) {
      const id = Number(index);

      const label =
        this.wallet.accounts[KeyringAccountType.HDAccount][id].label;

      await this.setDerivedWeb3Accounts(id, label);
    }
    if (
      accounts[KeyringAccountType.Imported] &&
      Object.keys(accounts[KeyringAccountType.Imported]).length > 0
    ) {
      await this.updateAllPrivateKeyAccounts();
    }

    return this.wallet.accounts[activeAccountType][activeAccountId];
  };

  private setDerivedWeb3Accounts = async (id: number, label: string) => {
    const seed = await mnemonicToSeed(this.memMnemonic);
    const privateRoot = hdkey.fromMasterSeed(seed);

    const derivedCurrentAccount = privateRoot.derivePath(
      `${ethHdPath}/0/${String(id)}`
    );

    const derievedWallet = derivedCurrentAccount.getWallet();
    const address = derievedWallet.getAddressString();
    const xprv = derievedWallet.getPrivateKeyString();
    const xpub = derievedWallet.getPublicKeyString();

    const basicAccountInfo = await this.getBasicWeb3AccountInfo(
      address,
      id,
      label
    );

    const createdAccount = {
      address,
      xpub,
      xprv: CryptoJS.AES.encrypt(xprv, this.memPassword).toString(),
      isImported: false,
      ...basicAccountInfo,
    };

    this.wallet.accounts[KeyringAccountType.HDAccount][id] = createdAccount;
  };

  private getSignerUTXO = async (
    network: INetwork
  ): Promise<{ rpc: any; isTestnet: boolean }> => {
    const { rpc, chain } = await getSysRpc(network);

    return {
      rpc,
      isTestnet: chain === 'test',
    };
  };

  private setSignerEVM = async (network: INetwork): Promise<void> => {
    try {
      const web3Provider = new ethers.providers.JsonRpcProvider(network.url);
      const { chainId } = await web3Provider.getNetwork();
      if (network.chainId !== chainId) {
        throw new Error(
          `SetSignerEVM: Wrong network information expected ${network.chainId} received ${chainId}`
        );
      }
      this.ethereumTransaction.setWeb3Provider(network);
    } catch (error) {
      throw new Error(`SetSignerEVM: Failed with ${error}`);
    }
  };

  private updateUTXOAccounts = async (
    rpc: {
      formattedNetwork: INetwork;
      networkConfig?: {
        networks: { mainnet: BitcoinNetwork; testnet: BitcoinNetwork };
        types: { xPubType: IPubTypes; zPubType: IPubTypes };
      };
    },
    isTestnet: boolean
  ) => {
    const accounts = this.wallet.accounts[KeyringAccountType.HDAccount];
    const { hd, main } = getSyscoinSigners({
      mnemonic: this.memMnemonic,
      isTestnet,
      rpc,
    });
    this.hd = hd;
    this.syscoinSigner = main;
    const walletAccountsArray = Object.values(accounts);

    // Create an array of promises.
    const accountPromises = walletAccountsArray.map(async ({ id }) => {
      await this.addUTXOAccount(Number(id));
    });
    await Promise.all(accountPromises);
  };

  private clearTemporaryLocalKeys = () => {
    this.wallet = initialWalletState;

    setEncryptedVault(
      {
        mnemonic: '',
      },
      this.memPassword
    );

    this.logout();
  };

  public logout = () => {
    this.memPassword = '';
    this.memMnemonic = '';
  };

  private isSyscoinChain = (network: any) =>
    Boolean(this.wallet.networks.syscoin[network.chainId]) &&
    network.url.includes('blockbook');

  private generateSalt = () => crypto.randomBytes(16).toString('hex');

  // ===================================== PRIVATE KEY ACCOUNTS METHODS - SIMPLE KEYRING ===================================== //
  private async updatePrivWeb3Account(account: IKeyringAccountState) {
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

  private async restoreWallet(hdCreated: boolean) {
    if (!this.memMnemonic) {
      const { mnemonic } = getDecryptedVault(this.memPassword);
      this.memMnemonic = CryptoJS.AES.decrypt(
        mnemonic,
        this.memPassword
      ).toString(CryptoJS.enc.Utf8);
    }
    if (this.activeChain === INetworkType.Syscoin && !hdCreated) {
      const { rpc, isTestnet } = await this.getSignerUTXO(
        this.wallet.activeNetwork
      );
      await this.updateUTXOAccounts(rpc, isTestnet);
      if (!this.hd) throw new Error('Error initialising HD');
      this.hd.setAccountIndex(this.wallet.activeAccountId);
    }
  }

  private async _getPrivateKeyAccountInfos(privKey: string, label?: string) {
    const { accounts } = this.wallet;

    //Validate if the private key value that we receive already starts with 0x or not
    const hexPrivateKey =
      privKey.slice(0, 2) === '0x' ? privKey : `0x${privKey}`;

    const importedAccountValue =
      this.ethereumTransaction.importAccount(hexPrivateKey);

    const { address, publicKey, privateKey } = importedAccountValue;

    //Validate if account already exists
    const accountAlreadyExists =
      (accounts[KeyringAccountType.Imported] &&
        Object.values(
          accounts[KeyringAccountType.Imported] as IKeyringAccountState[]
        ).some((account) => account.address === address)) ||
      Object.values(
        accounts[KeyringAccountType.HDAccount] as IKeyringAccountState[]
      ).some((account) => account.address === address); //Find a way to verify if private Key is not par of seed wallet derivation path

    if (accountAlreadyExists)
      throw new Error(
        'Account already exists, try again with another Private Key.'
      );

    const ethereumBalance = await this.ethereumTransaction.getBalance(address);
    const id =
      Object.values(accounts[KeyringAccountType.Imported]).length < 1
        ? 0
        : Object.values(accounts[KeyringAccountType.Imported]).length;

    const importedAccount = {
      ...initialActiveImportedAccountState,
      address,
      label: label ? label : `Imported ${id + 1}`,
      id: id,
      balances: {
        syscoin: 0,
        ethereum: ethereumBalance,
      },
      xprv: CryptoJS.AES.encrypt(privateKey, this.memPassword).toString(),
      xpub: publicKey,
      assets: {
        syscoin: [],
        ethereum: [],
      },
    } as IKeyringAccountState;

    return importedAccount;
  }

  public async importAccount(privKey: string, label?: string) {
    const importedAccount = await this._getPrivateKeyAccountInfos(
      privKey,
      label
    );
    this.wallet.accounts[KeyringAccountType.Imported][importedAccount.id] =
      importedAccount;

    return importedAccount;
  }
  //TODO: validate updateAllPrivateKeyAccounts updating 2 accounts or more works properly
  public async updateAllPrivateKeyAccounts() {
    const accountPromises = Object.values(
      this.wallet.accounts[KeyringAccountType.Imported]
    ).map(async (account) => await this.updatePrivWeb3Account(account));

    const updatedWallets = await Promise.all(accountPromises);

    // const updatedWallets = await Promise.all(
    //   Object.values(this.wallet.accounts[KeyringAccountType.Imported]).map(
    //     async (account) => await this.updatePrivWeb3Account(account)
    //   )
    // );

    this.wallet.accounts[KeyringAccountType.Imported] = updatedWallets;
  }
}
