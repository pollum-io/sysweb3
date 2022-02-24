import ERC20Abi from '../abi/erc20.json';
import { web3Provider } from '../provider/web3Provider';
import { contractInstance } from '../utils/contractInstance';

const getTokens = async (walletAddress, tokenAddress) => {
  try {
    const tokenBalance = await (
      await contractInstance(ERC20Abi, tokenAddress)
    ).methods
      .balanceOf(walletAddress)
      .call();

    const convertedBalance = web3Provider.utils.fromWei(tokenBalance);

    if (convertedBalance) {
      return convertedBalance;
    } else {
      return 0;
    }
  } catch (error) {
    console.log(error);
  }
};

console.log(getTokens('0x0beaDdE9e116ceF07aFedc45a8566d1aDd3168F3', '0xe527af9fbda1d44e02c425455e33fc2a0c2f9b33'));
