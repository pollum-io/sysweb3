import { INetwork } from '@pollum-io/sysweb3-utils';
import Web3 from 'web3';

export const web3Provider = new Web3(
  new Web3.providers.HttpProvider('https://rpc.syscoin.org/')
);

/**
 *
 * Available networks:
 * - Syscoin Mainnet (57) and Testnet (5700)
 * - Ethereum Mainnet (1)
 * - Ethereum Rinkeby (4)
 * - Polygon Mainnet (137) and Testnet (80001)
 *
 * @param chainId chain id of the network to set as active
 * @returns void
 *
 */
export const setActiveNetwork = (network: INetwork): void => {
  const { HttpProvider } = Web3.providers;

  web3Provider.setProvider(new HttpProvider(network.url));
};
