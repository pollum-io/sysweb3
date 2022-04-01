import { IKeyringAccountState, INetwork, IWalletState, MainSigner, SyscoinHDSigner, SyscoinMainSigner } from '@pollum-io/sysweb3-utils';
import CryptoJS from 'crypto-js';
import sys from 'syscoinjs-lib';
import { SyscoinTransactions } from '../transactions';
import { TrezorWallet } from '../trezor';

export const MainWallet = () => {
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

  const getEncryptedPrivateKey = ({ Signer: { accountIndex, accounts } }: SyscoinHDSigner, encryptedPassword: string) => {
    const privateKey = CryptoJS.AES.encrypt(
      accounts[
        accountIndex
      ].getAccountPrivateKey(),
      encryptedPassword
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
      saveTokenInfo: () => undefined,
      signTransaction: () => undefined,
      signMessage: () => undefined,
      getPrivateKey: () => xprv,
    };

    return account;
  };

  const getNewReceivingAddress = async () => {
    return hd ? hd.getNewReceivingAddress(true) : '';
  };

  const createWallet = async ({ encryptedPassword, mnemonic, wallet }: {
    encryptedPassword: string;
    mnemonic: string;
    wallet: IWalletState;
  }): Promise<{ account: IKeyringAccountState, hd: SyscoinHDSigner, main: any }> => {
    const { hd: _hd, main: _main } = MainSigner({
      walletMnemonic: mnemonic,
      isTestnet: wallet.activeNetwork.isTestnet,
      network: wallet.activeNetwork.url,
      blockbookURL: wallet.activeNetwork.url
    });

    hd = _hd;
    main = _main;

    const xprv = getEncryptedPrivateKey(hd, encryptedPassword);
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

    return {
      account,
      hd,
      main,
    };
  };

  const setSignerNetwork = async ({ encryptedPassword, mnemonic, network }: { encryptedPassword: string, mnemonic: string, network: INetwork }) => {
    const { hd: _hd, main: _main } = MainSigner({
      walletMnemonic: mnemonic,
      isTestnet: network.isTestnet,
      network: network.url,
      blockbookURL: network.url
    });

    hd = _hd;
    main = _main;

    const xprv = getEncryptedPrivateKey(hd, encryptedPassword);
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

    return {
      account,
      hd,
    }
  }

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
  };
};
