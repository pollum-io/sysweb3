import { web3Provider } from '../provider/web3Provider';

export const getBalance = async (walletAddress) => {
  try {
    const balance = await web3Provider().eth.getBalance(walletAddress);
    
    return web3Provider().utils.toWei(balance, 'ether');
  } catch (error) {
    console.log(`${error}`);
  }
};

