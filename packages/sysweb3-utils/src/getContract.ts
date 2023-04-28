import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { getErc20Abi, getErc21Abi, getErc55Abi } from './contracts';
import { isERC20Token, isERC721Token } from './utils';

export const getContractType = async (
  contractAddress: string,
  networkUrl: string
): Promise<ISupportsInterfaceProps | undefined> => {
  const httpProvider = new Web3.providers.HttpProvider(networkUrl);

  const web3Provider = new Web3(httpProvider);

  const [abi20, abi721, abi1155] = [
    getErc20Abi(),
    getErc21Abi(),
    getErc55Abi(),
  ];

  try {
    // ERC20 Here
    const erc20 = await isERC20Token(
      contractAddress,
      web3Provider,
      abi20 as AbiItem[]
    );

    if (erc20.isERC20) {
      return {
        type: 'ERC-20',
      };
    }
  } catch (_error20) {
    // As the ERC20 fails, so proceed to ERC721 validation
    try {
      const erc721 = await isERC721Token(
        contractAddress,
        web3Provider,
        abi721 as AbiItem[]
      );

      if (erc721.isERC721) {
        return {
          type: 'ERC-721',
        };
      } else {
        // As the validation for the interface 721 Fails we need to do the ERC1155 validation step here, because the ERC721 error
        //does not go to catch step, is only a false statement in ERC721 validation
        try {
          //ERC1155 Here

          const abi1155Contract = new web3Provider.eth.Contract(
            abi1155 as AbiItem[],
            contractAddress
          );

          const erc1155InterfaceIds = [
            '0xd9b67a26',
            '0x63759d50',
            '0x9e094e9e',
            '0xf2d03e40',
          ];

          const validateInterfaces1155 = await Promise.all(
            erc1155InterfaceIds.map(async (ids: string) => {
              const validateMethod1155 = await abi1155Contract.methods
                .supportsInterface(ids)
                .call();

              if (validateMethod1155) return true;

              return false;
            })
          );

          if (validateInterfaces1155.some((validate) => validate === true)) {
            return {
              type: 'ERC-1155',
              message:
                'Pali does not support ERC1155 contract for the time being, we are working to implement this as soon as possible.',
            };
          }
        } catch (_error1155) {
          // Display that ERC1155 validation fails
          return {
            type: 'Undefined',
            message:
              'No validation worked for this contract, please verify it.',
          };
        }
      }
    } catch (_error721) {
      // If the validation of ERC721 fails and don't go to ERC1155 the catch response has to be the same as the ERC 1155 catch.
      return {
        type: 'Undefined',
        message: 'No validation worked for this contract, please verify it.',
      };
    }
  }
};

export interface ISupportsInterfaceProps {
  type: string;
  message?: string;
}
