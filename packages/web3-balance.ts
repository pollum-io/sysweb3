import { web3Provider } from '../provider/web3Provider';
import _ from 'lodash';

export const getBalance = async (walletAddress) => {
  try {
    const balance = await web3Provider().eth.getBalance(walletAddress);

    const formattedBalance = web3Provider().utils.fromWei(balance);

    const roundedBalance = _.floor(parseFloat(formattedBalance), 4);

    return roundedBalance;
  } catch (error) {
    console.log(`${error}`);

    return 0;
  }
};
