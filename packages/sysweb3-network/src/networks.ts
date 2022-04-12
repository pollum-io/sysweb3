interface IWeb3Network {
  chainId: number;
  label: string;
  url: string;
  default: boolean;
  isTestnet: boolean;
  currency: string;
}

export const networks: {
  [chain: string]: {
    [chainId: number]: IWeb3Network;
  };
} = {
  syscoin: {
    57: {
      chainId: 57,
      currency: 'sys',
      default: true,
      isTestnet: false,
      label: 'Syscoin Mainnet',
      url: 'https://blockbook.elint.services/',
    },
    5700: {
      chainId: 5700,
      currency: 'tsys',
      default: true,
      isTestnet: true,
      label: 'Syscoin Testnet',
      url: 'https://blockbook-dev.elint.services/',
    },
  },
  ethereum: {
    1: {
      chainId: 1,
      currency: 'eth',
      default: true,
      isTestnet: false,
      url: 'https://mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
      label: 'Ethereum Mainnet',
    },
    42: {
      chainId: 42,
      currency: 'kov',
      default: true,
      isTestnet: true,
      label: 'Kovan',
      url: 'https://kovan.poa.network',
    },
    80001: {
      chainId: 800001,
      currency: 'matic',
      default: true,
      isTestnet: true,
      label: 'Polygon Testnet',
      url: 'https://polygon-mumbai.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
    },
    137: {
      chainId: 137,
      currency: 'matic',
      default: true,
      isTestnet: false,
      label: 'Polygon Mainnet',
      url: 'https://polygon-mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
    },
    4: {
      chainId: 4,
      currency: 'rin',
      default: true,
      isTestnet: true,
      label: 'Rinkeby',
      url: 'https://rinkeby.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
    },
  },
};
