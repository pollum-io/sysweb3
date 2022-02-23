//@ts-nocheck
import Web3 from 'web3';
import { networks } from '../networks/networks';

export const changeNetwork = async (chainId) => {
  let provider;

  for (var i = 0; i < networks.length; i++) {
    if (networks[i].chainId === chainId) {
      provider = networks[i].url;
    }
  }

  if (provider === undefined)
    throw new Error('Network not found, try again with a correct one!');

  const { HttpProvider } = Web3.providers;

  web3Provider.setProvider(new HttpProvider(provider));
};

export const web3Provider = new Web3(
  new Web3.providers.HttpProvider('https://rpc.syscoin.org/')
);
