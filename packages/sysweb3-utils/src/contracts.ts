// @ts-ignore
import { web3Provider } from '@pollum-io/sysweb3-network';
import { Contract, ContractOptions } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';

export const createContractUsingAbi = async (
  AbiContract: AbiItem[] | AbiItem | object,
  address?: string,
  options?: ContractOptions
): Promise<Contract> => {
  return new web3Provider.eth.Contract(
    AbiContract as AbiItem[],
    address,
    options
  );
};
