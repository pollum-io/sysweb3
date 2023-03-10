import { IEthSimpleKeyringManger, IKeyringAccountState, IWalletState, NewIEthereumTransactions } from "types";
import {getDecryptedVault, setEncryptedVault} from './storage'
import * as sysweb3 from '@pollum-io/sysweb3-core';
import {NewEthereumTransactions} from './transactions/new-ethereum'
import { initialActiveAccountState } from "initial-state";
import { INetwork } from "@pollum-io/sysweb3-utils";

export class EthSimpleKeyringManager implements IEthSimpleKeyringManger {
  private importedWallets: IKeyringAccountState[]
  private storage: any // todo type
  private web3Wallet: NewIEthereumTransactions

  constructor() {
    this.importedWallets = []
    this.storage = sysweb3.sysweb3Di.getStateStorageDb()
    this.web3Wallet = new NewEthereumTransactions()
  }

  private async _getLatestUpdateForPrivateKeyAccount(account: IKeyringAccountState, network: INetwork) {
    const [balance, transactions] = await Promise.all([
      await this.web3Wallet.getBalance(account.address),
      await this.web3Wallet.getUserTransactions(account.address, network),
    ]);

    const updatedAccount = {
      ...account,
      balances: {
        syscoin: 0,
        ethereum: balance,
      },
      transactions,
    } as IKeyringAccountState;

    return updatedAccount;
  }

  private async _getPrivateKeyAccountInfos(privKey: string, label?: string) {
    const {wallet: {accounts}, network} = getDecryptedVault()

    const {hash} = this.storage.get('vault-keys')

    //Validate if the private key value that we receive already starts with 0x or not
    const validatedPrivateKey =
      privKey.slice(0, 2) === '0x' ? privKey : `0x${privKey}`;

    const importedAccountValue = this.web3Wallet.importAccount(validatedPrivateKey);

    const { address, publicKey, privateKey } = importedAccountValue;

    //Validate if account already exists
    const accountAlreadyExists = Object.values(
      accounts as IKeyringAccountState[]
    ).some((account) => account.address === address)

    if(accountAlreadyExists) throw new Error('Account already exists, try again with another Private Key.')

    const [ethereumBalance, userTransactions] = await Promise.all([
      this.web3Wallet.getBalance(address),
      this.web3Wallet.getUserTransactions(address, network)
    ]) 

    const newImportedAccountValues = {
      ...initialActiveAccountState,
      address,
      label: label ? label : `Account ${Object.values(accounts).length + 1}`,
      id: Object.values(accounts).length,
      balances: {
        syscoin: 0,
        ethereum: ethereumBalance,
      },
      xprv: CryptoJS.AES.encrypt(privateKey, hash).toString(),
      xpub: publicKey,
      transactions: userTransactions.filter(Boolean),
      assets: {
        syscoin: [],
        ethereum: [],
      },
      isImported: true,
    } as IKeyringAccountState

    this.importedWallets.push(newImportedAccountValues)

    return newImportedAccountValues
  }

  public async handleImportAccountByPrivateKey(privKey: string, label?: string) {
    const {wallet: {accounts}} = getDecryptedVault()

    const importedAccountValue = await this._getPrivateKeyAccountInfos(privKey, label)

    const newWalletState = {
      ...getDecryptedVault().wallet,
      activeAccountId: importedAccountValue.id,
      accounts: {
        ...accounts,
        [importedAccountValue.id]: importedAccountValue
      }
    } as IWalletState

    setEncryptedVault({ ...getDecryptedVault(), newWalletState})

    return importedAccountValue
  }

  public async updateAllPrivateKeyAccounts() {
    const {wallet: {accounts, activeAccountId}, network} = getDecryptedVault()

    const updatedWallets = await Promise.all(
      this.importedWallets.map(async (account) => await this._getLatestUpdateForPrivateKeyAccount(account, network))
    )

    this.importedWallets = updatedWallets

    return accounts[activeAccountId]
  }

  public getImportedWallets() {
    return this.importedWallets
  }
}