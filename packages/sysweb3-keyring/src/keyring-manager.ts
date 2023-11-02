//@ts-nocheck @ts-ignore
import { generateMnemonic, validateMnemonic, mnemonicToSeed } from 'bip39';
import BIP84, { fromZPrv } from 'bip84';
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
import { CustomJsonRpcProvider } from './providers';
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
  private currentSessionSalt: string;
  private sessionPassword: string;
  private sessionMnemonic: string;
  private sessionSeed: string;
  public activeChain: INetworkType;
  public initialTrezorAccountState: IKeyringAccountState;
  private trezorAccounts: any[];
  public utf8Error: boolean;

  //transactions objects
  public ethereumTransaction: IEthereumTransactions;
  public syscoinTransaction: ISyscoinTransactions;
  constructor(opts?: IkeyringManagerOpts | null) {
    this.storage = sysweb3.sysweb3Di.getStateStorageDb();
    this.trezorAccounts = [];
    this.currentSessionSalt = this.generateSalt();
    this.sessionPassword = '';
    if (opts) {
      this.wallet = opts.wallet;
      this.activeChain = opts.activeChain;
      this.hd = null;
    } else {
      this.wallet = initialWalletState;
      this.activeChain = INetworkType.Syscoin;
      this.hd = new sys.utils.HDSigner('');
    }
    this.utf8Error = false;
    this.memMnemonic = '';
    this.sessionSeed = '';
    this.sessionMnemonic = '';
    this.memPassword = ''; //Lock wallet in case opts.password has been provided
    this.initialTrezorAccountState = initialActiveTrezorAccountState;

    this.trezorSigner = new TrezorKeyring(this.getSigner);

    // this.syscoinTransaction = SyscoinTransactions();
    this.syscoinTransaction = new SyscoinTransactions(
      this.getNetwork,
      this.getSigner,
      this.getAccountsState,
      this.getAddress
    );
    this.ethereumTransaction = new EthereumTransactions(
      this.getNetwork,
      this.getDecryptedPrivateKey,
      this.getSigner,
      this.getAccountsState
    );
  }
  // ===================================== AUXILIARY METHOD - FOR TRANSACTIONS CLASSES ===================================== //
  private getDecryptedPrivateKey = (): {
    address: string;
    decryptedPrivateKey: string;
  } => {
    try {
      if (!this.sessionPassword)
        throw new Error('Wallet is locked cant proceed with transaction');
      if (this.activeChain !== INetworkType.Ethereum)
        throw new Error('Switch to EVM chain');
      const { accounts, activeAccountId, activeAccountType } = this.wallet;

      const { xprv, address } = accounts[activeAccountType][activeAccountId];
      const decryptedPrivateKey = CryptoJS.AES.decrypt(
        xprv,
        this.sessionPassword
      ).toString(CryptoJS.enc.Utf8);

      return {
        address,
        decryptedPrivateKey,
      };
    } catch (error) {
      console.log('ERROR getDecryptedPrivateKey', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(this.memPassword),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
    }
  };
  private getSigner = (): {
    hd: SyscoinHDSigner;
    main: any; //TODO: Type this following syscoinJSLib interface
  } => {
    if (!this.sessionPassword) {
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
    return !!this.sessionPassword;
  };
  public lockWallet = () => {
    this.sessionPassword = '';
    this.sessionSeed = '';
  };

  public addNewAccount = async (label?: string) => {
    const network = this.wallet.activeNetwork;
    const mnemonic = this.sessionSeed;
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
    if (this.sessionPassword) {
      if (!prvPwd) {
        throw new Error('Previous password is required to change the password');
      }
      const genPwd = this.encryptSHA512(prvPwd, this.currentSessionSalt);
      if (genPwd !== this.sessionPassword) {
        throw new Error('Previous password is not correct');
      }
    }
    const salt = this.generateSalt();
    const hash = this.encryptSHA512(pwd, salt);
    this.memPassword = pwd; //This will be needed a bit longer on the memory for wallet creation purposes
    this.sessionPassword = this.encryptSHA512(pwd, this.currentSessionSalt);

    if (this.memMnemonic) {
      setEncryptedVault(
        {
          mnemonic: CryptoJS.AES.encrypt(this.memMnemonic, pwd).toString(),
        },
        this.memPassword
      );
      this.sessionMnemonic = CryptoJS.AES.encrypt(
        this.memMnemonic,
        pwd
      ).toString();
      this.memMnemonic = '';
    }
    if (prvPwd) this.updateWalletKeys(prvPwd);

    this.storage.set('vault-keys', {
      hash,
      salt,
      currentSessionSalt: this.currentSessionSalt,
    });
  };

  private validateAndHandleErrorByMessage(message: string) {
    const utf8ErrorMessage = 'Malformed UTF-8 data';
    if (
      message.includes(utf8ErrorMessage) ||
      message.toLowerCase().includes(utf8ErrorMessage.toLowerCase())
    ) {
      this.utf8Error = true;

      return this.utf8Error;
    }
  }

  private recoverLastSessionPassword(pwd: string): string {
    //As before locking the wallet we always keep the value of the last currentSessionSalt correctly stored in vault,
    //we use the value in vault instead of the one present in the class to get the last correct value for sessionPassword
    const initialVaultKeys = this.storage.get('vault-keys');

    //Here we need to validate if user has the currentSessionSalt in the vault-keys, because for Pali Users that
    //already has accounts created in some old version this value will not be in the storage. So we need to check it
    //and if user doesn't have we set it and if has we use the storage value
    if (
      !this.currentSessionSalt ||
      typeof initialVaultKeys.currentSessionSalt === 'undefined' ||
      this.currentSessionSalt === ''
    ) {
      this.storage.set('vault-keys', {
        ...initialVaultKeys,
        currentSessionSalt: this.currentSessionSalt,
      });

      return this.encryptSHA512(pwd, this.currentSessionSalt);
    }

    return this.encryptSHA512(pwd, initialVaultKeys.currentSessionSalt);
  }

  public unlock = async (
    password: string
  ): Promise<{
    canLogin: boolean;
    wallet?: IWalletState | null;
  }> => {
    try {
      const { hash, salt } = this.storage.get('vault-keys');

      const hashPassword = this.encryptSHA512(password, salt);

      let wallet: IWalletState | null = null;

      if (hashPassword === hash) {
        this.sessionPassword = this.recoverLastSessionPassword(password);

        const isHdCreated = !!this.hd;

        if (this.utf8Error || !this.sessionMnemonic || !isHdCreated) {
          await this.resetWalletValuesDueErrors(password);

          wallet = this.wallet;

          this.utf8Error = false;
        }
        this.updateWalletKeys(password);
      }

      return {
        canLogin: hashPassword === hash,
        wallet,
      };
    } catch (error) {
      console.log('ERROR unlock', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(password),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
    }
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
    const { activeAccountType, accounts, activeAccountId } = this.wallet;
    const { xpub } = accounts[activeAccountType][activeAccountId];
    let address = '';
    if (this.hd === null)
      throw new Error('HD not created yet, unlock or initialize wallet first');
    switch (activeAccountType) {
      case KeyringAccountType.HDAccount:
        address = await this.hd.getNewReceivingAddress(true, 84);
        break;
      case KeyringAccountType.Trezor:
        address = await this.getAddress(xpub, false, activeAccountId);
        break;
      default:
        break;
    }

    this.wallet.accounts[activeAccountType][activeAccountId].address = address;
    return address;
  };

  public createKeyringVault = async (): Promise<IKeyringAccountState> => {
    try {
      if (!this.memPassword) {
        throw new Error('Create a password first');
      }
      let { mnemonic } = getDecryptedVault(this.memPassword);
      mnemonic = CryptoJS.AES.decrypt(mnemonic, this.memPassword).toString(
        CryptoJS.enc.Utf8
      );
      const rootAccount = await this.createMainWallet(mnemonic);
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

      this.memPassword = '';
      const seed = (await mnemonicToSeed(mnemonic)).toString('hex');
      this.sessionSeed = CryptoJS.AES.encrypt(
        seed,
        this.sessionPassword
      ).toString();
      return rootAccount;
    } catch (error) {
      console.log('ERROR createKeyringVault', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(this.memPassword),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
    }
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
    try {
      const genPwd = this.encryptSHA512(pwd, this.currentSessionSalt);

      if (!this.sessionPassword) {
        throw new Error('Unlock wallet first');
      } else if (this.sessionPassword !== genPwd) {
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
        this.sessionPassword
      ).toString(CryptoJS.enc.Utf8);

      return decryptedPrivateKey;
    } catch (error) {
      console.log('ERROR getPrivateKeyByAccountId', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(pwd),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
    }
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
      this.sessionPassword
    ).toString();

  public getSeed = (pwd: string) => {
    const genPwd = this.encryptSHA512(pwd, this.currentSessionSalt);
    if (!this.sessionPassword) {
      throw new Error('Unlock wallet first');
    } else if (this.sessionPassword !== genPwd) {
      throw new Error('Invalid password');
    }
    let { mnemonic } = getDecryptedVault(pwd);
    mnemonic = CryptoJS.AES.decrypt(mnemonic, pwd).toString(CryptoJS.enc.Utf8);

    return mnemonic;
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
    if (
      this.wallet.activeNetwork.chainId === data.chainId &&
      this.activeChain === chainType
    ) {
      if (
        chainType === INetworkType.Syscoin &&
        this.syscoinSigner?.blockbookURL
      ) {
        this.syscoinSigner.blockbookURL = data.url;
      } else {
        this.ethereumTransaction.setWeb3Provider(data);
      }
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

  public addCustomNetwork = (chain: INetworkType, network: INetwork) => {
    const networkIdentifier = network.key ? network.key : network.chainId;

    this.wallet = {
      ...this.wallet,
      networks: {
        ...this.wallet.networks,
        [chain]: {
          ...this.wallet.networks[chain],
          [networkIdentifier]: network,
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
    // Create a new object without the specified property
    const updatedNetworks = Object.fromEntries(
      Object.entries(this.wallet.networks[chain]).filter(
        ([key]) => Number(key) !== chainId
      )
    );
    // Replace the networks object for the chain with the updated object
    this.wallet = {
      ...this.wallet,
      networks: {
        ...this.wallet.networks,
        [chain]: {
          ...updatedNetworks,
        },
      },
    };
    // this.wallet.networks[chain] = updatedNetworks;
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
      console.log('ERROR setSignerNetwork', {
        err,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(this.memPassword),
        },
      });
      this.validateAndHandleErrorByMessage(err.message);

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
    const genPwd = this.encryptSHA512(pwd, this.currentSessionSalt);
    if (!this.sessionPassword) {
      throw new Error('Unlock wallet first');
    } else if (this.sessionPassword !== genPwd) {
      throw new Error('Invalid password');
    }

    this.clearTemporaryLocalKeys(pwd);
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
      if (this.sessionPassword) {
        this.sessionMnemonic = CryptoJS.AES.encrypt(
          seedPhrase,
          this.sessionPassword
        ).toString();
        this.memMnemonic = '';
      }
      return seedPhrase;
    }
    throw new Error('Invalid Seed');
  };

  private getAccountsState = () => {
    const { activeAccountId, accounts, activeAccountType, activeNetwork } =
      this.wallet;
    return { activeAccountId, accounts, activeAccountType, activeNetwork };
  };
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

  private createMainWallet = async (
    mnemonic: string
  ): Promise<IKeyringAccountState> => {
    this.hd = new sys.utils.HDSigner(
      mnemonic,
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
    try {
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

      const basicAccountInfo = await this.getBasicSysAccountInfo(
        xpub,
        accountId
      );

      const createdAccount = {
        xprv,
        isImported: false,
        ...basicAccountInfo,
      };
      this.wallet.accounts[KeyringAccountType.HDAccount][accountId] =
        createdAccount;
    } catch (error) {
      console.log('ERROR addUTXOAccount', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(this.memPassword),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
    }
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
    let xpub, balance;
    try {
      const { descriptor, balance: _balance } =
        await this.trezorSigner.getAccountInfo({
          coin,
          slip44,
          index,
        });
      xpub = descriptor;
      balance = _balance;
    } catch (e) {
      throw new Error(e);
    }
    let ethPubKey = '';

    const isEVM = coin === 'eth';

    const address = isEVM ? xpub : await this.getAddress(xpub, false, +index);

    if (isEVM) {
      const response = await this.trezorSigner.getPublicKey({
        coin,
        slip44,
        index: +index,
      });
      ethPubKey = response.publicKey;
    }

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
      throw new Error('Account already exists on your Wallet.');
    if (!xpub || !balance || !address)
      throw new Error(
        'Something wrong happened. Please, try again or report it'
      );

    const id =
      Object.values(accounts[KeyringAccountType.Trezor]).length < 1
        ? 0
        : Object.values(accounts[KeyringAccountType.Trezor]).length;

    const trezorAccount = {
      ...this.initialTrezorAccountState,
      balances: {
        syscoin: +balance / 1e8,
        ethereum: 0,
      },
      address,
      originNetwork: { ...activeNetwork, isBitcoinBased: !isEVM },
      label: label ? label : `Trezor ${id + 1}`,
      id,
      xprv: '',
      xpub: isEVM ? ethPubKey : xpub,
      assets: {
        syscoin: [],
        ethereum: [],
      },
    } as IKeyringAccountState;

    return trezorAccount;
  }

  public getAddress = async (
    xpub: string,
    isChangeAddress: boolean,
    index: number
  ) => {
    const { hd, main } = this.getSigner();
    const options = 'tokens=used&details=tokens';

    const { tokens } = await sys.utils.fetchBackendAccount(
      main.blockbookURL,
      xpub,
      options,
      true
    );
    const { receivingIndex, changeIndex } =
      this.setLatestIndexesFromXPubTokens(tokens);

    const currentAccount = new BIP84.fromZPub(
      xpub,
      hd.Signer.pubTypes,
      hd.Signer.networks
    );

    this.trezorAccounts.push(currentAccount);

    const address = this.trezorAccounts[index]
      ? (this.trezorAccounts[index].getAddress(
          isChangeAddress ? changeIndex : receivingIndex,
          isChangeAddress,
          84
        ) as string)
      : (this.trezorAccounts[this.trezorAccounts.length - 1].getAddress(
          isChangeAddress ? changeIndex : receivingIndex,
          isChangeAddress,
          84
        ) as string);

    return address;
  };

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
    try {
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
    } catch (error) {
      console.log('ERROR addNewAccountToSyscoinChain', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(this.memPassword),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
    }
  }

  private async addNewAccountToEth(label?: string) {
    try {
      const { length } = Object.values(
        this.wallet.accounts[KeyringAccountType.HDAccount]
      );
      const seed = Buffer.from(
        CryptoJS.AES.decrypt(this.sessionSeed, this.sessionPassword).toString(
          CryptoJS.enc.Utf8
        ),
        'hex'
      );
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
        xprv: CryptoJS.AES.encrypt(xprv, this.sessionPassword).toString(),
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
    } catch (error) {
      console.log('ERROR addNewAccountToEth', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(this.memPassword),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
    }
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
    try {
      const { accounts, activeAccountId, activeAccountType } = this.wallet;

      //Account of HDAccount is always initialized as it is required to create a network
      for (const index in Object.values(
        accounts[KeyringAccountType.HDAccount]
      )) {
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
    } catch (error) {
      console.log('ERROR updateWeb3Accounts', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(this.memPassword),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
    }
  };

  private setDerivedWeb3Accounts = async (id: number, label: string) => {
    try {
      const seed = Buffer.from(
        CryptoJS.AES.decrypt(this.sessionSeed, this.sessionPassword).toString(
          CryptoJS.enc.Utf8
        ),
        'hex'
      );
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
        xprv: CryptoJS.AES.encrypt(xprv, this.sessionPassword).toString(),
        isImported: false,
        ...basicAccountInfo,
      };

      this.wallet.accounts[KeyringAccountType.HDAccount][id] = createdAccount;
    } catch (error) {
      console.log('ERROR setDerivedWeb3Accounts', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(this.memPassword),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
    }
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
    const abortController = new AbortController();
    try {
      const web3Provider = new CustomJsonRpcProvider(
        abortController.signal,
        network.url
      );
      const { chainId } = await web3Provider.getNetwork();
      if (network.chainId !== chainId) {
        throw new Error(
          `SetSignerEVM: Wrong network information expected ${network.chainId} received ${chainId}`
        );
      }
      this.ethereumTransaction.setWeb3Provider(network);
      abortController.abort();
    } catch (error) {
      abortController.abort();
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
    try {
      if (!this.sessionPassword) {
        throw new Error('Unlock wallet first');
      }
      const mnemonic = CryptoJS.AES.decrypt(
        this.sessionMnemonic,
        this.sessionPassword
      ).toString(CryptoJS.enc.Utf8);
      const accounts = this.wallet.accounts[KeyringAccountType.HDAccount];
      const { hd, main } = getSyscoinSigners({
        mnemonic: mnemonic,
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
    } catch (error) {
      console.log('ERROR updateUTXOAccounts', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(this.memPassword),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
    }
  };

  private clearTemporaryLocalKeys = (pwd: string) => {
    this.wallet = initialWalletState;

    setEncryptedVault(
      {
        mnemonic: '',
      },
      pwd
    );

    this.logout();
  };

  public logout = () => {
    this.sessionPassword = '';
    this.sessionSeed = '';
    this.currentSessionSalt = '';
    this.sessionMnemonic = '';
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

  private async resetWalletValuesDueErrors(pwd: string) {
    let { mnemonic } = getDecryptedVault(pwd);
    mnemonic = CryptoJS.AES.decrypt(mnemonic, pwd).toString(CryptoJS.enc.Utf8);
    this.sessionMnemonic = CryptoJS.AES.encrypt(
      mnemonic,
      this.sessionPassword
    ).toString();
    const seed = (await mnemonicToSeed(mnemonic)).toString('hex');
    this.sessionSeed = CryptoJS.AES.encrypt(
      seed,
      this.sessionPassword
    ).toString();

    if (this.activeChain === INetworkType.Syscoin) {
      const { rpc, isTestnet } = await this.getSignerUTXO(
        this.wallet.activeNetwork
      );
      await this.updateUTXOAccounts(rpc, isTestnet);
      if (!this.hd) throw new Error('Error initialising HD');
      this.hd.setAccountIndex(this.wallet.activeAccountId);
    } else if (this.activeChain === INetworkType.Ethereum) {
      await this.setSignerEVM(this.wallet.activeNetwork);
      await this.updateWeb3Accounts();
      if (!this.hd) throw new Error('Error initialising HD');
      this.hd.setAccountIndex(this.wallet.activeAccountId);
    }
  }

  private guaranteeUpdatedPrivateValues(pwd: string) {
    try {
      //Here we need to decrypt the sessionMnemonic and sessionSeed values with the sessionPassword value before it changes and get updated
      const decryptedSessionMnemonic = CryptoJS.AES.decrypt(
        this.sessionMnemonic,
        this.sessionPassword
      ).toString(CryptoJS.enc.Utf8);

      const decryptSessionSeed = CryptoJS.AES.decrypt(
        this.sessionSeed,
        this.sessionPassword
      ).toString(CryptoJS.enc.Utf8);

      //Generate a new salt
      this.currentSessionSalt = this.generateSalt();

      //Encrypt and generate a new sessionPassword to keep the values safe
      this.sessionPassword = this.encryptSHA512(pwd, this.currentSessionSalt);

      //Encrypt again the sessionSeed and sessionMnemonic after decrypt to keep it safe with the new sessionPassword value
      this.sessionSeed = CryptoJS.AES.encrypt(
        decryptSessionSeed,
        this.sessionPassword
      ).toString();

      this.sessionMnemonic = CryptoJS.AES.encrypt(
        decryptedSessionMnemonic,
        this.sessionPassword
      ).toString();
    } catch (error) {
      console.log('ERROR updateValuesToUpdateWalletKeys', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(pwd),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
    }
  }

  private async updateWalletKeys(pwd: string) {
    try {
      const vaultKeys = this.storage.get('vault-keys');
      let oldSessionPassword = pwd; //Default to the password to keep compatibility with older sysweb3 packages

      if (vaultKeys.currentSessionSalt) {
        oldSessionPassword = this.encryptSHA512(
          pwd,
          vaultKeys.currentSessionSalt
        );
      }

      //Update values
      this.guaranteeUpdatedPrivateValues(pwd);

      const { accounts } = this.wallet;
      for (const accountTypeKey in accounts) {
        // Exclude 'Trezor' accounts
        if (accountTypeKey !== KeyringAccountType.Trezor) {
          // Iterate through each account in the current accountType
          for (const id in accounts[accountTypeKey as KeyringAccountType]) {
            // Update xprv
            const encryptedxprv =
              accounts[accountTypeKey as KeyringAccountType][id].xprv;

            const decryptedxprv = CryptoJS.AES.decrypt(
              encryptedxprv,
              oldSessionPassword
            ).toString(CryptoJS.enc.Utf8);

            const encryptNewXprv = CryptoJS.AES.encrypt(
              decryptedxprv,
              this.sessionPassword
            ).toString();

            accounts[accountTypeKey as KeyringAccountType][id].xprv =
              encryptNewXprv;
          }
        }
      }
      //Update new currentSessionSalt value to state to keep it equal as the created at the updateValuesToUpdateWalletKeys function
      this.storage.set('vault-keys', {
        ...vaultKeys,
        currentSessionSalt: this.currentSessionSalt,
      });
    } catch (error) {
      console.log('ERROR updateWalletKeys', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(pwd),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
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
      xprv: CryptoJS.AES.encrypt(privateKey, this.sessionPassword).toString(),
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
    try {
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
    } catch (error) {
      console.log('ERROR updateAllPrivateKeyAccounts', {
        error,
        values: {
          memPass: this.memPassword,
          memMnemonic: this.memMnemonic,
          vaultKeys: this.storage.get('vault-keys'),
          vault: getDecryptedVault(this.memPassword),
        },
      });
      this.validateAndHandleErrorByMessage(error.message);
    }
  }

  public updateAccountLabel = (
    label: string,
    accountId: number,
    accountType: KeyringAccountType
  ) => {
    this.wallet.accounts[accountType][accountId].label = label;
  };
}
