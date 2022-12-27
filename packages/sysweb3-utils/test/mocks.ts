import CryptoJS from 'crypto-js';

import { initialWalletState } from '../../sysweb3-keyring/src/initial-state';

export const SEED = String(process.env.SEED_PEACE_GLOBE);
export const PASSWORD = 'a2s@AwWkjs452!';

export const UNENCRYPTED_VAULT = {
  wallet: initialWalletState,
  network: initialWalletState.activeNetwork,
  mnemonic: CryptoJS.AES.encrypt(SEED, PASSWORD).toString(),
  lastLogin: 0,
  isTestnet: false,
  rpc: {
    formattedNetwork: initialWalletState.activeNetwork,
    formattedBitcoinLikeNetwork: null,
  },
};
