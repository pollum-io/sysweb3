import { BitcoinNetwork, ISyscoinPubTypes, SyscoinHDSigner } from '@pollum-io/sysweb3-utils';
import { KeyringManager } from 'keyring-manager';
import sys from 'syscoinjs-lib';

export const Signer = () => {
  let hd: any = null;
  let main: any = null;

  const { getDecryptedMnemonic } = KeyringManager();

  const _mnemonic = getDecryptedMnemonic().toString();

  const _getSyscoinHdSigner = ({
    walletMnemonic,
    walletPassword,
    isTestnet,
    networks,
    SLIP44,
    pubTypes,
  }: {
    walletMnemonic: string,
    walletPassword?: string,
    isTestnet: boolean,
    networks?: BitcoinNetwork,
    SLIP44?: number,
    pubTypes?: ISyscoinPubTypes
  }): SyscoinHDSigner => {
    if (hd) return hd;

    hd = new sys.utils.HDSigner(
      walletMnemonic,
      walletPassword,
      isTestnet,
      networks,
      SLIP44,
      pubTypes
    );

    return hd;
  };

  if (main) return main;

  hd = _getSyscoinHdSigner({ walletMnemonic: _mnemonic, isTestnet: false });

  if (hd) {
    main = new sys.SyscoinJSLib(
      hd,
      'https://blockbook.elint.services/',
      'mainnet'
    );
  }

  return {
    main,
    hd,
  };
}