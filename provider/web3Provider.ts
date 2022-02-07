import Web3 from 'web3';
import { networks } from '../networks/networks';

let provider: any;

export const changeNetwork = (chainId: number) => {
  if (chainId) {
    networks.map((net) => {
      if (net.chainId === chainId) {
        provider = net.url;
      }
    });
  }
};

export const web3Provider = () => {
  return new Web3(
    new Web3.providers.HttpProvider(
      provider ||
        'https://mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241'
    )
  );
};
console.log(changeNetwork(1));

console.log(web3Provider().eth.currentProvider);

export default web3Provider;
