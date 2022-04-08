// @ts-ignore
import { web3Provider } from '@pollum-io/sysweb3-network';
import { ethers } from 'ethers';
import abi from './abi/erc20.json';
import { IErc20Token, createContractUsingAbi, INetwork } from '.';
import bech32 from 'bech32';

export const validateCurrentRpcUrl = () => {
  return web3Provider.eth.net.isListening((error: any, response: any) => {
    return {
      valid: Boolean(error),
      response,
    };
  });
};

export const validateToken = async (address: string) => {
  try {
    const contract = await createContractUsingAbi(abi, address);

    const [decimals, name, symbol]: IErc20Token[] = await Promise.all([
      contract.methods.decimals().call(),
      contract.methods.name().call(),
      contract.methods.symbol().call(),
    ]);

    const validToken = decimals && name && symbol;

    if (validToken) {
      return {
        name,
        symbol,
        decimals,
      };
    } else {
      throw new Error();
    }
  } catch (error) {
    throw new Error("Token not found, verify the Token Contract Address.");
  }
};

export const isBase64 = (string: string) => {
  const base64 =
    /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/;

  return base64.test(string);
};

export const isValidEthereumAddress = (address: string) => {
  return ethers.utils.isAddress(address);
};

const InfuraProvider = ethers.providers.InfuraProvider;

export const isContractAddress = async (address: string, chainId = 1) => {
  if (address) {
    const provider = new InfuraProvider(
      chainId,
      "c42232a29f9d4bd89d53313eb16ec241"
    );
    const code = await provider.getCode(address);
    return code !== "0x";
  }
  return false;
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
