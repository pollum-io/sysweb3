import { ethers, Contract, ContractInterface } from 'ethers';
import { INetwork } from 'networks';

import abi55 from './abi/erc1155.json';
import abi20 from './abi/erc20.json';
import abi21 from './abi/erc721.json';
import { getContract } from './getContract';

export const createContractUsingAbi = (
  AbiContract: ContractInterface,
  address?: string
): Contract => {
  return new ethers.Contract(String(address), AbiContract);
};

const HttpProvider = ethers.providers.JsonRpcProvider;

export const isContractAddress = async (
  address: string,
  networkUrl: string
) => {
  if (address) {
    const provider = new HttpProvider(networkUrl);
    const code = await provider.getCode(address);
    return code !== '0x';
  }
  return false;
};

export const contractChecker = async (
  contractAddress: string,
  network: INetwork
) => {
  const validateContractAddress = isContractAddress(
    contractAddress,
    network.url
  );

  if (!validateContractAddress)
    throw new Error(`Invalid contract address: ${contractAddress}`);

  try {
    const contractData = await getContract(contractAddress, network.url);

    return contractData;
  } catch (_error) {
    throw new Error(_error);
  }
};

export const getErc20Abi = () => abi20;

export const getErc21Abi = () => abi21;

export const getErc55Abi = () => abi55;
