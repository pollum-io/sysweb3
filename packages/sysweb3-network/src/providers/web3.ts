import { ethers } from 'ethers';

import { INetwork } from '@pollum-io/sysweb3-utils/src'; //TODO: add source to simplify local testing

export let web3Provider = new ethers.providers.JsonRpcProvider(
  'https://rpc.syscoin.org/'
);

export const getWeb3Provider = () => web3Provider;

export const setActiveNetwork = (network: INetwork) => {
  const { JsonRpcProvider } = ethers.providers;

  web3Provider = new JsonRpcProvider(network.url);
};
