import Web3 from 'web3';
import { networks } from '../networks/networks';
import web3Provider from '../provider/web3Provider';

export const changeNetwork = (chainId: number) => {
  if (chainId) {
    networks.map((net) => {
      if (net.chainId === chainId) {
        web3Provider(net.url);
      }
    });
  }
};

console.log(changeNetwork(4));
