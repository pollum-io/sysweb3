import Web3 from 'web3';
import { networks } from '../networks/networks';

const web3Provider = (chainId) => {
  let provider;

  if (chainId) {
    networks.map((net) => {
      if (net.chainId === chainId) {
        provider = new Web3(new Web3.providers.HttpProvider(net.url));
      }
    });
  } else {
    new Web3(
      new Web3.providers.HttpProvider(
        'https://mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241'
      )
    );
  }

  return provider;
};

export default web3Provider;
