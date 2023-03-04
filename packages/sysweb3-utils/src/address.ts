import { bech32 } from 'bech32';
import { ethers } from 'ethers';

import { INetwork, isContractAddress } from '.';

export const isValidEthereumAddress = (address: string) => {
  return ethers.utils.isAddress(address);
};

//TODO: this function needs to be refactorated to validate if its a valid bip84 address of any utxo chain
export const isValidSYSAddress = (
  address: string,
  network: INetwork,
  verification = true
) => {
  if (!verification) return true;

  // ? this if might be unnecessary
  if (address && typeof address === 'string') {
    try {
      const decodedAddr = bech32.decode(address);

      if (
        (network.chainId === 57 && decodedAddr.prefix === 'sys') ||
        (network.chainId === 5700 && decodedAddr.prefix === 'tsys')
      ) {
        const encode = bech32.encode(decodedAddr.prefix, decodedAddr.words);

        return encode === address.toLowerCase();
      }
    } catch (error) {
      return false;
    }
  }

  return false;
};

export const validateEOAAddress = async (
  address: string,
  networkUrl: string
): Promise<IValidateEOAAddressResponse> => {
  const validateContract = await isContractAddress(address, networkUrl);

  if (validateContract) {
    return {
      contract: true,
      wallet: false,
    };
  } else {
    const validateEthAddress = isValidEthereumAddress(address);

    if (validateEthAddress) {
      return {
        contract: false,
        wallet: true,
      };
    }

    return {
      contract: undefined,
      wallet: undefined,
    };
  }
};

interface IValidateEOAAddressResponse {
  contract: boolean | undefined;
  wallet: boolean | undefined;
}
