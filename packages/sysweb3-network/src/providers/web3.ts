import Web3 from 'web3';

import { INetwork } from '@pollum-io/sysweb3-utils';

export const web3Provider = new Web3(
  new Web3.providers.HttpProvider('https://rpc.syscoin.org/')
);

export const setActiveNetwork = (network: INetwork): void => {
  const { HttpProvider } = Web3.providers;

  web3Provider.setProvider(new HttpProvider(network.url));
};
