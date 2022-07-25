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
    },
    5700: {
      chainId: 5700,
      label: 'Syscoin Testnet',
      url: 'https://blockbook-dev.elint.services/',
      default: true,
      currency: 'tsys',
      apiUrl: '',
    },
  },
  ethereum: {
    1: {
      chainId: 1,
      url: 'https://mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
      label: 'Ethereum Mainnet',
      default: true,
      currency: 'eth',
      apiUrl: 'wss://mainnet.infura.io/ws/v3/c42232a29f9d4bd89d53313eb16ec241',
    },
    42: {
      url: 'https://kovan.poa.network',
      default: true,
      label: 'Kovan',
      chainId: 42,
      currency: 'kov',
      apiUrl: 'wss://kovan.infura.io/ws/v3/c42232a29f9d4bd89d53313eb16ec241',
    },
    4: {
      chainId: 4,
      label: 'Rinkeby',
      url: 'https://rinkeby.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
      default: true,
      currency: 'rin',
      apiUrl: 'wss://rinkeby.infura.io/ws/v3/c42232a29f9d4bd89d53313eb16ec241',
    },
    3: {
      chainId: 3,
      currency: 'rop',
      default: true,
      label: 'Ropsten',
      url: 'https://ropsten.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
      apiUrl: 'wss://ropsten.infura.io/ws/v3/c42232a29f9d4bd89d53313eb16ec241',
    },
    5: {
      chainId: 5,
      currency: 'gor',
      default: true,
      label: 'Goerli',
      url: 'https://goerli.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
      apiUrl: 'wss://goerli.infura.io/ws/v3/c42232a29f9d4bd89d53313eb16ec241',
    },
    137: {
      chainId: 137,
      currency: 'matic',
      default: true,
      label: 'Polygon Mainnet',
      url: 'https://polygon-mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
      apiUrl: 'https://api.polygonscan.com/api',
    },
    80001: {
      chainId: 80001,
      currency: 'matic',
      default: true,
      label: 'Polygon Mumbai Testnet',
      url: 'https://rpc-mumbai.maticvigil.com',
      apiUrl: 'wss://rpc-mumbai.matic.today',
    },
    57: {
      chainId: 57,
      currency: 'sys',
      default: true,
      label: 'Syscoin Mainnet',
      url: 'https://rpc.syscoin.org',
      apiUrl: 'wss://rpc.syscoin.org/wss',
    },
    5700: {
      chainId: 5700,
      currency: 'tsys',
      default: true,
      label: 'Syscoin Tanenbaum',
      url: 'https://rpc.tanenbaum.io',
      apiUrl: 'wss://rpc.tanenbaum.io/wss',
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
