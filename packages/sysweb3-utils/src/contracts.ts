import { ethers } from 'ethers';
import { Contract, ContractOptions } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';

import { web3Provider } from '@pollum-io/sysweb3-network';

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

const InfuraProvider = ethers.providers.InfuraProvider;

export const isContractAddress = async (address: string, chainId = 1) => {
  if (address) {
    const provider = new InfuraProvider(
      chainId,
      'c42232a29f9d4bd89d53313eb16ec241'
    );
    const code = await provider.getCode(address);
    return code !== '0x';
  }
  return false;
};
