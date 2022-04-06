// @ts-nocheck
import { networks, setActiveNetwork } from '@pollum-io/sysweb3-network';
import { IKeyringAccountState, INetwork, IWalletState, MainSigner, SyscoinHDSigner, SyscoinMainSigner } from '@pollum-io/sysweb3-utils';
import { Web3Accounts } from '../accounts';
import CryptoJS from 'crypto-js';
import sys from 'syscoinjs-lib';
import { SyscoinTransactions } from '../transactions';
import { TrezorWallet } from '../trezor';
import { fromZPrv } from 'bip84';
import { SyscoinAddress } from '../address';

export const MainWallet = ({ actions: { checkPassword } }: { actions: { checkPassword: (pwd: string) => boolean } }) => {
  const web3Wallet = Web3Accounts();

  let hd: SyscoinHDSigner = {} as SyscoinHDSigner;
  let main: SyscoinMainSigner = {} as SyscoinMainSigner;

  /** set/get account info */

  const _getBackendAccountData = async (
    xpub: string,
  ): Promise<{
    address: string | null;
    balance: number;
    transactions: any;
    tokens: any;
  }> => {
    console.log('[_getBackendAccountData]', { hd, main, xpub });

    const response =
      await sys.utils.fetchBackendAccount(
        main.blockbookURL,
        xpub,
        'tokens=nonzero&details=txs',
        true
      );


    console.log('[_getBackendAccountData] response', { hd, main, xpub, response });

    return {
      address: '',
      balance: 0 / 1e8,
      transactions: txs,
      tokens: {},
    };
  };

  const getAccountInfo = async (
    xpub: string
  ): Promise<any> => {
    console.log('[getAccountInfo] getting backend account...');

    const backendAccountData = await _getBackendAccountData(
      xpub,
    );

    console.log(
      '[getAccountInfo] backend account data',
      {
        backendAccountData,
        main,
        xpub,
        hd,
      }
    );

    return backendAccountData;
  };

  const getEncryptedPrivateKey = ({ Signer: { accountIndex, accounts } }: SyscoinHDSigner, password: string) => {
    const privateKey = CryptoJS.AES.encrypt(
      accounts[
        accountIndex
      ].getAccountPrivateKey(),
      password
    ).toString();

    return privateKey;
  };

  const getAccountXpub = (): string => hd ? hd.getAccountXpub() : '';

  const _getInitialAccountData = ({
    label,
    signer,
    createdAccount,
    xprv,
  }: { label?: string, signer: any, createdAccount: any, xprv: string }) => {
    console.log('[get initial account data] getting initial account...')
    const { balance, address } = createdAccount;
    const xpub = getAccountXpub();

    const account: IKeyringAccountState = {
      id: signer.Signer.Signer.accountIndex,
      label: label ? label : `Account ${signer.Signer.Signer.accountIndex + 1}`,
      balances: {
        syscoin: balance,
        ethereum: 0,
      },
      xpub,
      xprv,
      address,
      isTrezorWallet: false,
    };

    return account;
  };

  const getEncryptedPrivateKeyFromHd = () => hd.Signer.accounts[hd.Signer.accountIndex].getAccountPrivateKey();

  const getLatestUpdateForAccount = async (
    activeAccount: IKeyringAccountState
  ) => {
    return await getAccountInfo(activeAccount.xpub);
  };

  /** end */

  /** set/get networks */

  const _getAccountForNetwork = async ({ isSyscoinChain, password, mnemonic, network, index }: { isSyscoinChain: boolean, password: string, mnemonic: string, network: INetwork, index: number }) => {
    if (isSyscoinChain) {
      const { hd: _hd, main: _main } = MainSigner({
        walletMnemonic: mnemonic,
        isTestnet: network.isTestnet,
        network: network.url,
        blockbookURL: network.url
      });

      hd = _hd;
      main = _main;

      const xprv = getEncryptedPrivateKey(hd, password);
      const xpub = getAccountXpub();

      console.log('[switch network] getting signer', main, xpub);

      const updatedAccountInfo = await getAccountInfo(xpub);

      console.log('[switch network] getting created account', updatedAccountInfo, updatedAccountInfo.address);

      const account = _getInitialAccountData({
        signer: main,
        createdAccount: updatedAccountInfo,
        xprv,
      });
      console.log('[switch network] got created account', updatedAccountInfo, updatedAccountInfo.address);

      hd && hd.setAccountIndex(account.id);

      return account;
    }

    const web3Account = web3Wallet.importAccount(mnemonic);

    const balance = await web3Wallet.getBalance(web3Account.address);

    return {
      ...web3Account,
      tokens: {},
      id: index,
      isTrezorWallet: false,
      label: `Account ${index}`,
      transactions: {},
      trezorId: -1,
      xprv: '',
      balances: {
        ethereum: balance,
        syscoin: 0,
      },
      xpub: '',
    } as IKeyringAccountState;
  }

  const setSignerNetwork = async ({ password, mnemonic, network, index }: { password: string, mnemonic: string, network: INetwork, index: number }): Promise<IKeyringAccountState> => {
    const isSyscoinChain = Boolean(networks.syscoin[network.chainId]);

    if (!isSyscoinChain) {
      setActiveNetwork('ethereum', network.chainId);
    }

    const account = await _getAccountForNetwork({ isSyscoinChain, password, mnemonic, network, index });


    return account;
  }

  /** end */

  /** create/forget wallet */

  const createMainWallet = async ({ password, mnemonic, wallet }: {
    password: string;
    mnemonic: string;
    wallet: IWalletState;
  }): Promise<IKeyringAccountState> => {
    const { hd: _hd, main: _main } = MainSigner({
      walletMnemonic: mnemonic,
      isTestnet: wallet.activeNetwork.isTestnet,
      network: wallet.activeNetwork.url,
      blockbookURL: wallet.activeNetwork.url
    });

    hd = _hd;
    main = _main;

    const xprv = getEncryptedPrivateKey(hd, password);
    const xpub = getAccountXpub();

    console.log('[create] getting signer', main, xpub);

    const createdAccount = await getAccountInfo(xpub);

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

  /** controllers */

  const trezor = TrezorWallet({ hd, main });
  const txs = SyscoinTransactions({ hd, main });
  const address = SyscoinAddress({ mnemonic: _mnemonic, wallet });

  /** end */

  return {
    createMainWallet,
    getAccountXpub,
    getAccountInfo,
    getEncryptedPrivateKey,
    trezor,
    txs,
    address,
    setSignerNetwork,
    getSeed,
    hasHdMnemonic,
    forgetSigners,
    setAccountIndexForDerivedAccount,
    getEncryptedPrivateKeyFromHd,
    getLatestUpdateForAccount,
  };
};
