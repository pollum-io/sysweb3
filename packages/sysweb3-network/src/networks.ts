interface IWeb3Network {
  chainId: number;
  networkName: string;
  url: string;
}

export const networks: { [chainId: number]: IWeb3Network } = {
  57: {
    chainId: 57,
    networkName: 'Syscoin Mainnet',
    url: 'https://rpc.syscoin.org/',
  },
  5700: {
    chainId: 5700,
    networkName: 'Syscoin Testnet',
    url: 'https://rpc.tanenbaum.io/',
  },
  1: {
    chainId: 1,
    networkName: 'Web3 Mainnet',
    url: 'https://mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
  },
  4: {
    chainId: 4,
    networkName: 'Rinkeby',
    url: 'https://rinkeby.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
  },
  137: {
    chainId: 137,
    networkName: 'Polygon Mainnet',
    url: 'https://polygon-mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
  },
  80001: {
    chainId: 80001,
    networkName: 'Polygon Testnet',
    url: 'https://polygon-mumbai.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241',
  },
};
