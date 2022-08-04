import { ethers, Contract, ContractInterface } from 'ethers';

import abi20 from './abi/erc20.json';
import abi21 from './abi/erc721.json';

export const createContractUsingAbi = (
  AbiContract: ContractInterface,
  address?: string
): Contract => {
  return new ethers.Contract(String(address), AbiContract);
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

export const getErc20Abi = () => abi20;

export const getErc21Abi = () => abi21;
