import { INetworkType, IWalletState } from './types';

export const initialActiveAccountState = {
  address: '',
  tokens: {},
  balances: {
    [INetworkType.Ethereum]: 0,
    [INetworkType.Syscoin]: 0,
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
      isTestnet: false,
      currency: 'sys'
    },
    5700: {
      chainId: 5700,
      label: 'Syscoin Testnet',
      url: 'https://blockbook-dev.elint.services/',
      default: true,
      isTestnet: true,
      currency: 'tsys'
    },
  },
  ethereum: {
    1: {
      chainId: 1,
      url: 'https://mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
      label: 'Ethereum Mainnet',
      default: true,
      isTestnet: false,
      currency: 'eth'
    },
    42: {
      url: 'https://kovan.poa.network',
      isTestnet: true,
      default: true,
      label: 'Kovan',
      chainId: 42,
      currency: 'kov'
    },
    80001: {
      chainId: 800001,
      label: 'Polygon Testnet',
      default: true,
      isTestnet: true,
      currency: 'matic',
      url: 'https://polygon-mumbai.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
    },
    137: {
      chainId: 137,
      label: 'Polygon Mainnet',
      url: 'https://polygon-mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
      default: true,
      isTestnet: false,
      currency: 'matic'
    },
    4: {
      chainId: 4,
      label: 'Rinkeby',
      url: 'https://rinkeby.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
      default: true,
      isTestnet: true,
      currency: 'rin'
    }
  },
};

export const initialWalletState: IWalletState = {
  accounts: {},
  activeAccount: initialActiveAccountState,
  networks: initialNetworksState,
  hasEncryptedVault: false,
  activeNetwork: {
    chainId: 57,
    label: 'Syscoin Mainnet',
    url: 'https://blockbook.elint.services/',
    default: true,
    isTestnet: false,
  },
  activeToken: 'SYS',
};