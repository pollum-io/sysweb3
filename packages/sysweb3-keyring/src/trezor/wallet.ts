import { fromZPub } from 'bip84';
import sys from 'syscoinjs-lib';

import {
  IKeyringAccountState,
  IWalletState,
  MainSigner,
} from '@pollum-io/sysweb3-utils';

export const TrezorWallet = ({
  tx,
  mnemonic,
  wallet: { activeNetwork },
}: {
  tx: any;
  mnemonic: string;
  wallet: IWalletState;
}) => {
  const { main } = MainSigner({
    walletMnemonic: mnemonic,
    isTestnet: activeNetwork.isTestnet,
    network: activeNetwork.url,
    blockbookURL: activeNetwork.url,
  });

  const getAccountInfo = async (
    xpub: string,
    sysjs: any,
    trezorId: number
  ): Promise<IKeyringAccountState> => {
    const { pubtypes, networks } = main;

    const { tokens, transactions, assets, balance } =
      await sys.utils.fetchBackendAccount(
        sysjs.blockbookURL,
        xpub,
        'tokens=nonzero&details=txs',
        true
      );

    const trezorAccount: any = new fromZPub(xpub, pubtypes, networks);

    let receivingIndex = -1;

    if (tokens) {
      tokens.forEach((token: any) => {
        if (token.path) {
          const splitPath = token.path.split('/');

          if (splitPath.length >= 6) {
            const change = parseInt(splitPath[4], 10);
            const index = parseInt(splitPath[5], 10);

            if (change === 1) {
              return;
            }

            if (index > receivingIndex) {
              receivingIndex = index;
            }
          }
        }
      });
    }

    const accountInfo = {
      id: 9999 + trezorId,
      label: `Trezor ${trezorId + 1}`,
      transactions,
      xpub,
      xprv: '',
      address: trezorAccount.getAddress(receivingIndex + 1),
      tokens: assets,
      connectedTo: [],
      isTrezorWallet: true,
      trezorId: trezorId + 1,
      balances: {
        syscoin: balance / 10 ** 8,
        ethereum: 0,
      },
      saveTokenInfo: () => {},
      signTransaction: () => {},
      signMessage: () => {},
      getPrivateKey: () => accountInfo.xprv,
    };

    return accountInfo;
  };

  const createWallet = async (): Promise<IKeyringAccountState> => {
    try {
      const trezorSigner = new sys.utils.TrezorSigner();

      await trezorSigner.createAccount();

      const syscoin = new sys.SyscoinJSLib(main, main.blockbookURL);

      const accountInfo: IKeyringAccountState = await getAccountInfo(
        syscoin.HDSigner.getAccountXpub(),
        syscoin,
        0
      );

      return accountInfo;
    } catch (error: any) {
      throw new Error(error);
    }
  };

  const forgetWallet = () => {};

  const getAddress = (trezor: any, kdPath: any) => {
    return new Promise(function (resolve, reject) {
      trezor.ethereumGetAddress(kdPath, (response: any) => {
        if (response.success) {
          return resolve(response);
        }

        return reject(response.error);
      });
    });
  };

  return {
    createWallet,
    forgetWallet,
    getAddress,
    tx,
  };
};
