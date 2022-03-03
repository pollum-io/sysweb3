import { web3Provider } from '../provider/web3Provider';
import _ from 'lodash';

/**
 * This function should return the balance of current account.
 * 
 * @param walletAddress
 * 
 * Use example: 
 * 
 * ```
 * <button onClick={getBalance('0x000000000000000000000')}>Get balance!</button>
 * ```
 * 
 * Return example:
 * 
 * ```
 *     0.24501
 *```
 *
 */

export const getBalance = async (walletAddress: string) => {
  try {
    const balance = await web3Provider.eth.getBalance(walletAddress);
    const formattedBalance = web3Provider.utils.fromWei(balance);

    const roundedBalance = _.floor(parseFloat(formattedBalance), 4);

    return roundedBalance;
  } catch (error) {
    console.log(`${error}`);

    return 0;
  }
};
