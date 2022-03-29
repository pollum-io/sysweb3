import { IWalletState } from '.';

export const initialActiveAccountState = {
  address: '',
  tokens: {},
  balances: {
    ethereum: 0,
    syscoin: 0,
  },
  id: -1,
  isTrezorWallet: false,
  label: 'Account 1',
  transactions: {},
  trezorId: -1,
  xprv: '',
  xpub: '',
  saveTokenInfo() { },
  signTransaction() { },
  signMessage() { },
  getPrivateKey: () => initialActiveAccountState.xprv,
};

export const initialNetworksState = {
  syscoin: {
    57: {
      chainId: 57,
      label: 'Syscoin Mainnet',
      url: 'https://blockbook.elint.services/',
      default: true,
    },
    5700: {
      chainId: 5700,
      label: 'Syscoin Testnet',
      url: 'https://blockbook-dev.elint.services/',
      default: true,
    },
  },
  ethereum: {
    1: {
      chainId: 1,
      label: 'Kovan',
      url: 'https://blockbook-dev.elint.services/',
      default: true,
    },
  },
};

export const initialWalletState: IWalletState = {
  lastLogin: 0,
  accounts: {},
  activeAccount: initialActiveAccountState,
  networks: initialNetworksState,
  hasEncryptedVault: false,
  version: '2.0.0',
  timer: 5,
  temporaryTransactionState: {
    executing: false,
    type: '',
  },
  activeNetwork: {
    chainId: 57,
    label: 'Syscoin Mainnet',
    url: 'https://blockbook.elint.services/',
    default: true,
  },
  getState: () => initialWalletState,
  activeToken: 'SYS',
};
