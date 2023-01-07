import Web3 from 'web3';

import { getErc21Abi, getErc55Abi } from './contracts';

export const getContract = async (
  contractAddress: string,
  networkUrl: string
) => {
  const provider = new Web3.providers.HttpProvider(networkUrl);

  const web3Provider = new Web3();

  web3Provider.setProvider(provider);

  const [abi721, abi1155] = [getErc21Abi(), getErc55Abi()];

  const abisInfos = [
    { abi: abi721, interfaceId: '0x80ac58cd', type: 'ERC-721' },
    { abi: abi1155, interfaceId: '0xd9b67a26', type: 'ERC-1155' },
  ];

  const contract = abisInfos.filter(async (abiInfo: any) => {
    //Type any in abiInfo because we don't have a AbiItem type to use, so any is to don't get errors
    try {
      const _contract = new web3Provider.eth.Contract(
        abiInfo.abi,
        contractAddress
      ) as any; // Type any because Contract type doesnt have supportsInterface function inside the type

      const support = await _contract
        .supportsInterface(abiInfo.interfaceId)
        .send();

      if (support) return true;

      return false;
    } catch (error) {
      return false;
    }
  });

  if (contract.length === 0) return { contract: null, standard: null };

  return {
    contract: new web3Provider.eth.Contract(
      contract[0].abi as any, // Same as above
      contractAddress
    ),
    standard: contract[0].type,
  };
};
