import { BitcoinNetwork, ISyscoinPubTypes, SyscoinHDSigner } from './types';
const sys = require('syscoinjs-lib');

let mainSigner: any = null;
let hdSigner: SyscoinHDSigner | null = null;

export const getMainSigner = ({
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

export const getHdSigner = ({
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

export const mainSigner = () => ({ hd: getHdSigner(), main: getMainSigner() });
