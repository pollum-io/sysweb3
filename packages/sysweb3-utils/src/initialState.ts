import { IWalletState } from '.';

export const initialActiveAccountState = {
  address: '',
  balances: {
    ethereum: 0,
    syscoin: 0,
  },
  id: -1,
  isTrezorWallet: false,
  label: 'Account 1',
  trezorId: -1,
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
      currency: 'sys'
    },
    5700: {
      chainId: 5700,
      label: 'Syscoin Testnet',
      url: 'https://blockbook-dev.elint.services/',
      default: true,
      currency: 'tsys'
    },
  },
  ethereum: {
    1: {
      chainId: 1,
      url: 'https://mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
      label: 'Ethereum Mainnet',
      default: true,
      currency: 'eth'
    },
    42: {
      url: 'https://kovan.poa.network',
      default: true,
      label: 'Kovan',
      chainId: 42,
      currency: 'eth'
    },
    4: {
      chainId: 4,
      label: 'Rinkeby',
      url: 'https://rinkeby.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
      default: true,
      currency: 'eth'
    }
  },
};

export const initialWalletState: IWalletState = {
  accounts: {},
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