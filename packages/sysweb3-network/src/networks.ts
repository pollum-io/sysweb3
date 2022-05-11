interface IWeb3Network {
  chainId: number;
  label: string;
  url: string;
  default: boolean;
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
      label: 'Syscoin Mainnet',
      url: 'https://blockbook.elint.services/',
    },
    5700: {
      chainId: 5700,
      currency: 'tsys',
      default: true,
      label: 'Syscoin Testnet',
      url: 'https://blockbook-dev.elint.services/',
    },
  },
  ethereum: {
    1: {
      chainId: 1,
      currency: 'eth',
      default: true,
      url: 'https://mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
      label: 'Ethereum Mainnet',
    },
    42: {
      chainId: 42,
      currency: 'kov',
      default: true,
      label: 'Kovan',
      url: 'https://kovan.poa.network',
    },
    4: {
      chainId: 4,
      currency: 'rin',
      default: true,
      label: 'Rinkeby',
      url: 'https://rinkeby.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
    },
    3: {
      chainId: 3,
      currency: 'rop',
      default: true,
      label: 'Ropsten',
      url: 'https://ropsten.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
    },
    5: {
      chainId: 5,
      currency: 'gor',
      default: true,
      label: 'Goerli',
      url: 'https://goerli.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
    },
  },
};
