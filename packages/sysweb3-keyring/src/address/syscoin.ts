import { IWalletState, MainSigner } from '@pollum-io/sysweb3-utils';

export const SyscoinAddress = ({ mnemonic, wallet: { activeNetwork } }: { mnemonic: string, wallet: IWalletState }) => {
  const { hd } = MainSigner({
    walletMnemonic: mnemonic,
    isTestnet: activeNetwork.isTestnet,
    network: activeNetwork.url,
    blockbookURL: activeNetwork.url
  });

  /** get new receiving address passing true to skip increment,
   *  this way we always receive a new unused and valid address for
   *  each transaction
   */
  const getValidAddress = () => hd.getNewReceivingAddress(true);

  const getChangeAddress = () => hd.getNewChangeAddress(true);

  return {
    getValidAddress,
    getChangeAddress,
  };
};
