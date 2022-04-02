import { networks, setActiveNetwork } from '@pollum-io/sysweb3-network';
import { IKeyringAccountState, INetwork, IWalletState, MainSigner, SyscoinHDSigner, SyscoinMainSigner } from '@pollum-io/sysweb3-utils';
import { Web3Accounts } from '../accounts';
import CryptoJS from 'crypto-js';
import sys from 'syscoinjs-lib';
import { SyscoinTransactions } from '../transactions';
import { TrezorWallet } from '../trezor';
import { fromZPrv } from 'bip84';

export const MainWallet = ({ actions: { checkPassword } }: { actions: { checkPassword: (pwd: string) => boolean } }) => {
  const web3Wallet = Web3Accounts();

  let hd: SyscoinHDSigner = {} as SyscoinHDSigner;
  let main: SyscoinMainSigner = {} as SyscoinMainSigner;

  const _getBackendAccountData = async (
    xpub: string,
    isHardwareWallet: boolean
  ): Promise<{
    address: string | null;
    balance: number;
    transactions: any;
    tokens: any;
  }> => {
    console.log('[create] get backend account signer', main, xpub);

    const { tokensAsset, balance, transactions } =
      await sys.utils.fetchBackendAccount(
        main.blockbookURL,
        xpub,
        isHardwareWallet
          ? 'tokens=nonzero&details=txs'
          : 'tokens=nonzero&details=txs',
        true
      );

    console.log('[create] backend account fetch sys', transactions, balance);

    const tokens: any = {};

    if (tokensAsset) {
      for (const token of tokensAsset) {
        const tokenId = token.assetGuid;

        tokens[tokenId] = {
          ...token,
          tokenId,
          balance:
            (tokens[tokenId] ? Number(tokens[tokenId].balance) : 0) +
            Number(token.balance),
          symbol: token.symbol ? atob(String(token.symbol)) : '',
        };
      }
    }

    const txs: any = {};

    if (transactions) {
      for (const transaction of transactions.slice(0, 20)) {
        const { fees, txid, value, blockHeight, valueIn } = transaction;
        txs[txid] = {
          ...transaction,
          fees: Number(fees),
          value: Number(value),
          blockHeight: Number(blockHeight),
          valueIn: Number(valueIn),
        };
      }
    }

    const address = hd ? await hd.getNewReceivingAddress(true) : null;
    const lastTransactions = Object.values(txs).slice(0, 20);

    console.log('[create] txs', txs, lastTransactions);

    return {
      address,
      balance: balance / 1e8,
      transactions: txs,
      tokens,
    };
  };

  const getAccountInfo = async (
    isHardwareWallet = false,
    xpub: string
  ): Promise<any> => {
    console.log('[create] fetching backend account...');

    const backendAccountData = await _getBackendAccountData(
      xpub,
      isHardwareWallet
    );

    console.log(
      '[create] getting backend account data',
      backendAccountData,
      main
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
    const { balance, transactions, tokens, address } = createdAccount;
    const xpub = getAccountXpub();

    const account: IKeyringAccountState = {
      id: signer.Signer.Signer.accountIndex,
      label: label ? label : `Account ${signer.Signer.Signer.accountIndex + 1}`,
      balances: {
        syscoin: balance,
        ethereum: 0,
      },
      transactions,
      xpub,
      xprv,
      address,
      tokens,
      isTrezorWallet: false,
    };

    return account;
  };

  const getNewReceivingAddress = async () => {
    return hd ? hd.getNewReceivingAddress(true) : '';
  };

  const createWallet = async ({ password, mnemonic, wallet }: {
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

    const createdAccount = await getAccountInfo(false, xpub);

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

  const _getAccountForNetwork = async ({ isSyscoinChain, password, mnemonic, network }: { isSyscoinChain: boolean, password: string, mnemonic: string, network: INetwork }) => {
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

      const updatedAccountInfo = await getAccountInfo(false, xpub);

      console.log('[switch network] getting created account', updatedAccountInfo, updatedAccountInfo.address);

      const account = _getInitialAccountData({
        signer: main,
        createdAccount: updatedAccountInfo,
        xprv,
      });

      hd && hd.setAccountIndex(account.id);

      return account;
    }

    const web3Account = web3Wallet.importAccount(mnemonic);

    return {
      ...web3Account,
      tokens: {},
      id: hd.Signer.accountIndex,
      isTrezorWallet: false,
      label: `Account ${hd.Signer.accountIndex}`,
      transactions: {},
      trezorId: -1,
      xprv: '',
      balances: {
        ethereum: web3Wallet.getBalance(web3Account.address),
        syscoin: 0,
      },
      xpub: '',
    };
  }

  const setSignerNetwork = async ({ password, mnemonic, network }: { password: string, mnemonic: string, network: INetwork }) => {
    const isSyscoinChain = Boolean(networks.syscoin[network.chainId]);

    if (!isSyscoinChain) {
      setActiveNetwork('ethereum', network.chainId);
    }

    const account = await _getAccountForNetwork({ isSyscoinChain, password, mnemonic, network });

    return {
      account,
      hd,
    }
  }

  const saveTokenInfo = (address: string) => console.log('token address', address);

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

  const getEncryptedPrivateKeyFromHd = () => hd.Signer.accounts[hd.Signer.accountIndex].getAccountPrivateKey();

  const trezor = TrezorWallet({ hd, main });
  const txs = SyscoinTransactions({ hd, main });

  return {
    getNewReceivingAddress,
    createWallet,
    getAccountXpub,
    getAccountInfo,
    getEncryptedPrivateKey,
    trezor,
    txs,
    setSignerNetwork,
    saveTokenInfo,
    getSeed,
    hasHdMnemonic,
    forgetSigners,
    setAccountIndexForDerivedAccount,
    getEncryptedPrivateKeyFromHd
  };
};
