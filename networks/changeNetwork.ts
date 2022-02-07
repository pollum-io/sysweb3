import Web3 from 'web3';
import { networks } from '../networks/networks';
import web3Provider from '../provider/web3Provider';

const changeNetwork = (chainId: never) => {
  if (chainId) {
    networks.map((net) => {
      if (net.chainId === chainId) {
        return web3Provider(net.url);
      }
    });
  }
};

export default changeNetwork;
