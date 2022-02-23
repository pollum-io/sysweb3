import { web3Provider } from '../provider/web3Provider';
import ERC20Abi from '../abi/erc20.json';
import { AbiItem } from 'web3-utils';

export const contractInstance = async (
  AbiContract: any,
  contractAddress: any
) => {
  return new web3Provider.eth.Contract(
    AbiContract as AbiItem[],
    contractAddress
  );
};
