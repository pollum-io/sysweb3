import { bech32 } from 'bech32';
import { ethers } from 'ethers';

import { INetwork } from '.';

export const isValidEthereumAddress = (address: string) => {
  return ethers.utils.isAddress(address);
};

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
