import * as ethers from 'ethers';

import erc1155Abi from './abi/erc1155.json';
import erc20Abi from './abi/erc20.json';
import erc721Abi from './abi/erc721.json';

export const getContractType = async (
  contractAddress: string,
  networkUrl: string
): Promise<ISupportsInterfaceProps | undefined> => {
  const provider = new ethers.providers.JsonRpcProvider(networkUrl);

  try {
    const contractERC721 = new ethers.Contract(
      contractAddress,
      erc721Abi,
      provider
    );

    const supportsInterface = await contractERC721.supportsInterface(
      '0x80ac58cd'
    ); // ERC721

    if (supportsInterface) {
      return { type: 'ERC-721' };
    }
    throw new Error('ERC-721');
  } catch (e) {
    try {
      const contractERC1155 = new ethers.Contract(
        contractAddress,
        erc1155Abi,
        provider
      );
      const supportsInterface = await contractERC1155.supportsInterface(
        '0xd9b67a26'
      ); // ERC1155
      if (supportsInterface) {
        return { type: 'ERC-1155' };
      }
      throw new Error('ERC-1155');
    } catch (e) {
      try {
        const contractERC20 = new ethers.Contract(
          contractAddress,
          erc20Abi,
          provider
        );
        const balanceOf = await contractERC20.balanceOf(contractAddress);

        if (typeof balanceOf === 'object') {
          return { type: 'ERC-20' };
        }
        throw new Error('ERC-20');
      } catch (e) {
        return { type: 'Unknown', message: 'Standard not recognized' };
      }
    }
  }
};

export interface ISupportsInterfaceProps {
  type: string;
  message?: string;
}
