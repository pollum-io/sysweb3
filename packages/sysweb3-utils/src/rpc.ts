import { MAX_SAFE_CHAIN_ID } from "./constants";
import axios from 'axios';
import bip44Constants from 'bip44-constants';

export const isValidChainIdForEthNetworks = (chainId: number) => {
  return (
    Number.isSafeInteger(chainId) && chainId > 0 && chainId <= MAX_SAFE_CHAIN_ID
  );
}

export const validateSysRpc = async (
  rpcUrl: string
): Promise<{ data: any; valid: boolean, isTestnet: boolean }> => {
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

  const isTestnet = !!(chain === 'main');

  return {
    valid,
    data,
    isTestnet,
  };
};
