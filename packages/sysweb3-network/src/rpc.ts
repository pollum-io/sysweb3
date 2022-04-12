import { web3Provider } from '@pollum-io/sysweb3-network';
import { jsonRpcRequest } from './rpc-request';

// const hexRegEx = /^0x[0-9a-f]+$/iu;
// const chainIdRegEx = /^0x[1-9a-f]+[0-9a-f]*$/iu;

export const validateCurrentRpcUrl = () => {
  return web3Provider.eth.net.isListening((error: any, response: any) => {
    return {
      valid: Boolean(error),
      response,
    };
  });
};

const isCustomRpcWithInvalidChainId = (chainId: number) =>
  typeof chainId !== 'number';

export const validateEthRpc = async ({
  url,
  chainId,
}: {
  url: string;
  chainId: number;
}) => {
  if (isCustomRpcWithInvalidChainId(chainId))
    return new Error(`RPC with invalid chain ID: ${chainId}`);

  const response = jsonRpcRequest(url, 'eth_chainId');

  if (!response) return new Error('Invalid RPC data');

  return response;
};

export const validateSysRpc = (chainId: number) => {
  if (isCustomRpcWithInvalidChainId(chainId))
    return new Error(`RPC with invalid chain ID: ${chainId}`);
};
