//@ts-nocheck
import Web3 from 'web3';
import { networks } from '../networks/networks';

let provider;

export const changeNetwork = async (chainId) => {
  if (chainId) {
    networks.map((net) => {
      if (net.chainId === chainId) {
        provider = net.url;

        return provider;
      }
    });
  }
  return provider;
  console.log('networkId: ' + (await web3Provider().eth.getChainId()));
};

export const web3Provider = () => {
  return new Web3(
    new Web3.providers.HttpProvider(
      provider ? provider : 'https://rpc.syscoin.org/'
    )
  );
};
