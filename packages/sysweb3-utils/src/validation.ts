import { web3Provider } from '@syspollum/sysweb3-network';
import { IErc20Token } from '@syspollum/sysweb3-types';
import abi from './abi/erc20.json';
import { createContractUsingAbi } from '.';

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
      contract.methods.symbol().call(),
      contract.methods.decimals().call(),
      contract.methods.name().call(),
    ]);

    if (decimals && name && symbol) {
      return {
        name,
        symbol,
        decimals,
      };
    } else {
      throw new Error();
    }
  } catch (error) {
    throw new Error('Token not found, verify the Token Contract Address.');
  }
};
