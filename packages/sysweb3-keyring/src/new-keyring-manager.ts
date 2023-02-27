import axios from 'axios';
import { generateMnemonic, validateMnemonic } from 'bip39';
import { fromZPrv } from 'bip84';
import crypto from 'crypto';
import CryptoJS from 'crypto-js';
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
  getAsset,
  getDecryptedVault,
  getSigners,
  setEncryptedVault,
  SyscoinHDSigner,
} from '@pollum-io/sysweb3-utils';

export type ISysAccount = {
  xprv?: string;
  xpub: string;
  balances: IKeyringBalances;
  transactions: [];
  assets?: [];
  address: string;
  label: string;
  id: number;
};

export class NewKeyringManager {
  private hash: string;
  private salt: string;
  private xprv: string;
  private xpub: string;

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

    this.ethereumTransaction = EthereumTransactions();
    this.syscoinTransaction = SyscoinTransactions();
  }

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

  public isSeedValid = (seedPhrase: string) => validateMnemonic(seedPhrase);

  public checkPassword = (password: string): boolean => {
    const { hash, salt } = this.storage.get('vault-keys');
    console.log(hash, salt);
    const hashPassword = this.encryptSHA512(password, salt);
    console.log(hashPassword);
    if (hashPassword === hash) {
      this.actualPassword = password;
    }
    return hashPassword === hash;
  };

  public createSeed = () => this.setSeed(generateMnemonic());

  public createKeyringVault = async (): Promise<IKeyringAccountState> => {
    const { hash } = this.storage.get('vault-keys');
    const encryptedMnemonic = CryptoJS.AES.encrypt(
      this.memMnemonic,
      hash
    ).toString();

    setEncryptedVault({
      ...getDecryptedVault(),
      wallet: this.wallet,
      network: this.wallet.activeNetwork,
      mnemonic: encryptedMnemonic,
    });

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
      lastLogin: 0,
    });

    return vault;
  };

  private generateSalt = () => crypto.randomBytes(16).toString('hex');

  private encryptSHA512 = (password: string, salt: string) => {
    const hash = crypto.createHmac('sha512', salt);

    hash.update(password);

    this.hash = hash.digest('hex');

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
  private getEncryptedXprv = () =>
    CryptoJS.AES.encrypt(
      this.getEncryptedPrivateKeyFromHd(),
      this.hash
    ).toString();

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

    const accounts: ISysAccount[] = decryptedWallet.accounts;

    for (const account of Object.values(accounts)) {
      await this.setDerivedSysAccounts(account.id);
    }

    if (this.hd && decryptedWallet.activeAccount.id > -1)
      this.hd.setAccountIndex(decryptedWallet.activeAccount.id);

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

    const xpub = this.hd.getAccountXpub();
    const xprv = this.getEncryptedXprv();
    const address = this.hd.getNewReceivingAddress(true);

    const basicAccountInfo = await this.getBasicSysAccountInfo(xpub, id);

    const createdAccount = {
      address,
      xprv,
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

  private getAccountXpub = (): string => this.hd.getAccountXpub();
}
