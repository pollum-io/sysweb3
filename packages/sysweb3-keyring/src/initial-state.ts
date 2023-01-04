import { IKeyringAccountState, IWalletState } from './types';

export const initialActiveAccountState: IKeyringAccountState = {
  address: '',
  balances: {
    ethereum: 0,
    syscoin: 0,
  },
  id: 0,
  isTrezorWallet: false,
  label: 'Account 1',
  xprv: '',
  xpub: '',
  transactions: [],
  assets: {
    syscoin: [],
    ethereum: [],
  },
};

// todo: remove explorer from state
export const initialNetworksState = {
  syscoin: {
    57: {
      chainId: 57,
      label: 'Syscoin Mainnet',
      url: 'https://blockbook.elint.services/',
      default: true,
      currency: 'sys',
      explorer: 'https://blockbook.elint.services/',
    },
    5700: {
      chainId: 5700,
      label: 'Syscoin Testnet',
      url: 'https://blockbook-dev.elint.services/',
      default: true,
      currency: 'tsys',
      explorer: '',
    },
  },
  ethereum: {
    137: {
      chainId: 137,
      currency: 'matic',
      default: true,
      label: 'Polygon Mainnet',
      url: 'https://polygon-rpc.com',
      explorer: 'https://polygonscan.com/',
    },
    80001: {
      chainId: 80001,
      currency: 'matic',
      default: true,
      label: 'Polygon Mumbai Testnet',
      url: 'https://rpc-mumbai.maticvigil.com',
      explorer: 'https://mumbai.polygonscan.com/',
    },
    57: {
      chainId: 57,
      currency: 'sys',
      default: true,
      label: 'Syscoin Mainnet',
      url: 'https://rpc.syscoin.org',
      explorer: 'https://explorer.syscoin.org/',
    },
    5700: {
      chainId: 5700,
      currency: 'tsys',
      default: true,
      label: 'Syscoin Tanenbaum',
      url: 'https://rpc.tanenbaum.io',
      explorer: 'https://tanenbaum.io/',
    },
  },
};

export const initialWalletState: IWalletState = {
  accounts: {
    [initialActiveAccountState.id]: initialActiveAccountState,
  },
  activeAccount: initialActiveAccountState,
  networks: initialNetworksState,
  activeNetwork: {
    chainId: 57,
    label: 'Syscoin Mainnet',
    url: 'https://blockbook.elint.services/',
    default: true,
    currency: 'sys',
  },
};
