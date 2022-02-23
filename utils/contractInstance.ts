import { web3Provider } from '../provider/web3Provider';
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
