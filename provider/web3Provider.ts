//@ts-nocheck
import Web3 from 'web3';
import { networks } from '../networks/networks';

let provider;

export const sysChangeNetwork = async (chainId) => {
  if (chainId) {
    networks.map((net) => {
      if (net.chainId === chainId) {
        provider = net.url;
      }
    });
  }
  console.log('networkId: ' + await web3Provider().eth.getChainId())
};

export const web3Provider = () => {
  return new Web3(
    new Web3.providers.HttpProvider(
      provider ||
        'https://mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241'
    )
  );
};
