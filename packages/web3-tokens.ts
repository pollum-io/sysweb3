import ERC20Abi from '../abi/erc20.json';
import { web3Provider } from '../provider/web3Provider';
import { contractInstance } from '../utils/contractInstance';

const getTokens = async () => {
  try {
    const tokenAddress = '0xe527af9fbda1d44e02c425455e33fc2a0c2f9b33';
    const myWalletAddress = '0x0beaDdE9e116ceF07aFedc45a8566d1aDd3168F3';

    const tokenBalance = await (
      await contractInstance(ERC20Abi, tokenAddress)
    ).methods
      .balanceOf(myWalletAddress)
      .call();

    const convertBalance = web3Provider.utils.fromWei(tokenBalance);

    console.log(convertBalance);

    //   return tokenBalance;
  } catch (error) {
    console.log(error);
  }
};

console.log(getTokens());
