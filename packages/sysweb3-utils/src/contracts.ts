import { ethers, Contract, ContractInterface } from 'ethers';
import { INetwork } from 'networks';

import abi55 from './abi/erc1155.json';
import abi20 from './abi/erc20.json';
import abi21 from './abi/erc721.json';
import { CONTRACT_ERRORS } from './contractErrors';
import { getContract } from './getContract';
import { getContractInfo } from './getContractInfo';
import { setActiveNetwork } from '@pollum-io/sysweb3-network';

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

export const contractChecker = async (
  contractAddress: string,
  network: INetwork
) => {
  setActiveNetwork(network);

  const validateContractAddress = isContractAddress(contractAddress);

  if (!validateContractAddress)
    throw new Error(`Invalid contract address: ${contractAddress}`);

  try {
    let contract: Contract | null;

    try {
      const contractData = await getContract(contractAddress, network.url);

      contract = contractData.contract as Contract | null;
    } catch (_error) {
      throw new Error(_error);
    }

    const contractInfos: any = await getContractInfo(contract as Contract);

    const filterErrors = Object.keys(contractInfos).filter(
      (key) => contractInfos[key] === null
    );

    if (filterErrors.length === 0) {
      return { error: false };
    }

    const errorsArray = filterErrors.map((error) => CONTRACT_ERRORS[error]);

    return {
      error: true,
      errors: errorsArray,
    };
  } catch (_error) {
    throw new Error(_error);
  }
};

export const getErc20Abi = () => abi20;

export const getErc21Abi = () => abi21;

export const getErc55Abi = () => abi55;
