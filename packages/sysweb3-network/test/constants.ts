import * as dotenv from 'dotenv';
dotenv.config();
export const EXAMPLE_L1 = {
  url: 'https://rpc.ankr.com/eth',
  chainId: 1,
  apiUrl: 'https://etherscan.io/',
  isSyscoinRPC: false,
  label: 'ETH',
};

export const EXAMPLE_L2 = {
  url: 'https://mainnet.optimism.io',
  chainId: 10,
  apiUrl: 'https://optimistic.etherscan.io/',
  isSyscoinRPC: false,
  label: 'OPTIMISM',
};

export const SYS_L2 = {
  url: 'https://bedrock.rollux.com:9545',
  chainId: 57000,
  apiUrl: undefined,
  isSyscoinRPC: false,
  label: 'ROLLUX',
  symbol: 'SYS',
};

export const TESTNET = {
  url: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  chainId: 5,
  apiURL: 'https://goerli.etherscan.io/',
  isSyscoinRPC: false,
  label: 'GOERLI',
};
