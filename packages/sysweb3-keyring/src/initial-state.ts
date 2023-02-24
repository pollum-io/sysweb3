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
  assets: [],
};

export const initialNetworksState = {
  syscoin: {
    57: {
      chainId: 57,
      label: 'Syscoin Mainnet',
      url: 'https://blockbook.elint.services/',
      default: true,
      currency: 'sys',
      apiUrl: '',
      explorer: 'https://blockbook.elint.services/',
    },
    5700: {
      chainId: 5700,
      label: 'Syscoin Testnet',
      url: 'https://blockbook-dev.elint.services/',
      default: true,
      currency: 'tsys',
      apiUrl: '',
      explorer: '',
    },
  },
  ethereum: {
    1: {
      chainId: 1,
      url: 'https://rpc.ankr.com/eth',
      label: 'Ethereum Mainnet',
      default: true,
      currency: 'eth',
      explorer: 'https://etherscan.io/',
      apiUrl: 'https://api.etherscan.io/api',
    },
    137: {
      chainId: 137,
      currency: 'matic',
      default: true,
      label: 'Polygon Mainnet',
      url: 'https://polygon-rpc.com',
      apiUrl: 'https://api.polygonscan.com/api',
      explorer: 'https://polygonscan.com/',
    },
    80001: {
      chainId: 80001,
      currency: 'matic',
      default: true,
      label: 'Polygon Mumbai Testnet',
      url: 'https://rpc.ankr.com/polygon_mumbai',
      apiUrl: 'https://api-testnet.polygonscan.com/api',
      explorer: 'https://mumbai.polygonscan.com/',
    },
    57: {
      chainId: 57,
      currency: 'sys',
      default: true,
      label: 'Syscoin Mainnet',
      url: 'https://rpc.syscoin.org',
      apiUrl: 'https://explorer.syscoin.org/api',
      explorer: 'https://explorer.syscoin.org/',
    },
    5700: {
      chainId: 5700,
      currency: 'tsys',
      default: true,
      label: 'Syscoin Tanenbaum',
      url: 'https://rpc.tanenbaum.io',
      apiUrl: 'https://tanenbaum.io/api',
      explorer: 'https://tanenbaum.io/',
    },
  },
};

export const initialWalletState: IWalletState = {
  accounts: {
    [initialActiveAccountState.id]: initialActiveAccountState,
  },
  activeAccount: 0,
  networks: initialNetworksState,
  activeNetwork: {
    chainId: 57,
    label: 'Syscoin Mainnet',
    url: 'https://blockbook.elint.services/',
    default: true,
    currency: 'sys',
  },
};
