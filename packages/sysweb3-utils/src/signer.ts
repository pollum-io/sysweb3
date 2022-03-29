import { BitcoinNetwork, ISyscoinPubTypes, SyscoinHDSigner } from './types';
import sys from 'syscoinjs-lib';

export const MainSigner = ({
  walletMnemonic,
  isTestnet,
  network,
  blockbookURL,
}: {
  walletMnemonic: string;
  isTestnet: boolean;
  network: string;
  blockbookURL: string;
}) => {
  let mainSigner: any = null;
  let hdSigner: SyscoinHDSigner | null = null;

  const getMainSigner = ({
    SignerIn,
    blockbookURL,
    network,
  }: {
    SignerIn?: any;
    blockbookURL?: string;
    network?: any;
  }) => {
    if (!mainSigner) {
      mainSigner = new sys.SyscoinJSLib(SignerIn, blockbookURL, network);
    }

    return mainSigner;
  };

  const getHdSigner = ({
    walletMnemonic,
    walletPassword,
    isTestnet,
    networks,
    SLIP44,
    pubTypes,
  }: {
    SLIP44?: string;
    isTestnet: boolean;
    networks?: BitcoinNetwork;
    pubTypes?: ISyscoinPubTypes;
    walletMnemonic: string;
    walletPassword?: string;
  }): SyscoinHDSigner | null => {
    if (!hdSigner) {
      hdSigner = new sys.utils.HDSigner(
        walletMnemonic,
        walletPassword,
        isTestnet,
        networks,
        SLIP44,
        pubTypes
      );
    }

    return hdSigner;
  };

  const hd = getHdSigner({ walletMnemonic, isTestnet });
  const main = getMainSigner({ SignerIn: hd, network, blockbookURL });

  return {
    hd,
    main,
  }
}
