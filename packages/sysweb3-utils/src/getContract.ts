import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { getErc20Abi, getErc21Abi, getErc55Abi } from './contracts';

const erc20Functions = [
  'totalSupply',
  'balanceOf',
  'transfer',
  'transferFrom',
  'approve',
  'allowance',
];

async function isERC20Token(
  contractAddress: string,
  web3Provider: any,
  abi20: AbiItem[]
) {
  const contract = new web3Provider.eth.Contract(abi20, contractAddress);

  // check if the contract implements all the mandatory ERC-20 functions
  const contractFunctions = contract.methods;
  const missingFunctions = erc20Functions.filter(
    (func) => !(func in contractFunctions)
  );

  if (missingFunctions.length === 0) {
    return true;
  }

  return false;
}

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
    const isErc20 = await isERC20Token(
      contractAddress,
      web3Provider,
      abi20 as AbiItem[]
    );

    if (isErc20) {
      return {
        type: 'ERC-20',
      };
    }
  } catch (_error20) {
    // As the ERC20 fails, so proceed to ERC721 validation
    try {
      // ERC721 Here
      const abi721Contract1 = new web3Provider.eth.Contract(
        abi721 as AbiItem[],
        contractAddress
      );

      const erc721InterfaceIds = [
        '0x80ac58cd',
        '0xc87b56dd',
        '0x79f154c4',
        '0x42966c68',
      ];

      const validateInterfaces721 = await Promise.all(
        erc721InterfaceIds.map(async (ids: string) => {
          const validateMethod721 = await abi721Contract1.methods
            .supportsInterface(ids)
            .call();
          if (validateMethod721) return true;

          return false;
        })
      );

      if (validateInterfaces721.some((validate) => validate === true)) {
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
