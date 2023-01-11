import { ethers, Contract, ContractInterface } from 'ethers';

import abi55 from './abi/erc1155.json';
import abi20 from './abi/erc20.json';
import abi21 from './abi/erc721.json';
import { getContractType, ISupportsInterfaceProps } from './getContract';

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
  if (!address) return false;
  try {
    const provider = new HttpProvider(networkUrl);
    const code = await provider.getCode(address);

    return Boolean(code !== '0x');
  } catch (error) {
    if (String(error).includes('bad address checksum')) return false;
  }
};

export const contractChecker = async (
  contractAddress: string,
  networkUrl: string
) => {
  try {
    const validateContractAddress = await isContractAddress(
      contractAddress,
      networkUrl
    );

    if (!validateContractAddress)
      throw new Error(`Invalid contract address: ${contractAddress}`);

    const contractData = (await getContractType(
      contractAddress,
      networkUrl
    )) as ISupportsInterfaceProps;

    return contractData;
  } catch (error) {
    return error;
  }
};

export const getErc20Abi = () => abi20;

export const getErc21Abi = () => abi21;

export const getErc55Abi = () => abi55;
