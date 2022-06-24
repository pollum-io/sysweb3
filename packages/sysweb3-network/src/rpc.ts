import { jsonRpcRequest } from './rpc-request';
import { web3Provider } from '@pollum-io/sysweb3-network';
import axios from 'axios';
//@ts-ignore
import bip44Constants from 'bip44-constants';

export const validateCurrentRpcUrl = () => {
  return web3Provider.eth.net.isListening((error: any, response: any) => {
    return {
      valid: Boolean(error),
      response,
    };
  });
};

const isValidChainIdForEthNetworks = (chainId: number | string) =>
  Number.isSafeInteger(chainId) && chainId > 0 && chainId <= 4503599627370476;

export const validateCustomEthRpc = async (
  chainId: number,
  rpcUrl: string,
): Promise<{ valid: boolean }> => {
    if (!isValidChainIdForEthNetworks(Number(chainId)))
      throw new Error('Invalid chain ID for ethereum networks.');
  
    const hexRegEx = /^0x[0-9a-f]+$/iu;
    const chainIdRegEx = /^0x[1-9a-f]+[0-9a-f]*$/iu;
  
    const hexChainId = `0x${chainId.toString(16)}`;
  
    const isChainIdInvalid =
      typeof hexChainId === 'string' &&
      !chainIdRegEx.test(hexChainId) &&
      hexRegEx.test(hexChainId);
  
    if (isChainIdInvalid) {
      throw new Error('RPC has an invalid chain ID');
    }
  
    const response = await jsonRpcRequest(rpcUrl, 'eth_chainId');
  
    const chainIdVerified = Boolean(Number(web3Provider.utils.hexToNumber(response)) === Number(chainId))
  
    return {
      valid: Boolean(!!response && chainIdVerified),
    };
  };

export const validateSysRpc = async (
  rpcUrl: string
): Promise<{ data: any; valid: boolean }> => {
  const response = await axios.get(`${rpcUrl}/api/v2`);

  const {
    blockbook: { coin },
    backend: { chain },
  } = response.data;

  const valid = Boolean(response && coin && chain);

  if (!valid) throw new Error('Invalid RPC URL');

  const bip44Coin = bip44Constants.find(
    (item: [number, string, string]) => item[2] === coin
  );

  const coinTypeInDecimal = bip44Coin[0];
  const symbol = bip44Coin[1];

  const coinTypeInHex = Number(coinTypeInDecimal).toString(16);

  const data = {
    chainId: coinTypeInHex,
    url: rpcUrl,
    default: false,
    currency: symbol.toString().toLowerCase(),
  };

  return {
    valid,
    data,
  };
};
