import axios from 'axios';
import bip44Constants from 'bip44-constants';
import { Chain, chain, chains } from 'eth-chains';
import { ethers } from 'ethers';

import { jsonRpcRequest } from './rpc-request';
import {
  getFormattedBitcoinLikeNetwork,
  INetwork,
  toDecimalFromHex,
} from '@pollum-io/sysweb3-utils';

export const validateChainId = (
  chainId: number | string
): { valid: boolean; hexChainId: string } => {
  const hexRegEx = /^0x[0-9a-f]+$/iu;
  const chainIdRegEx = /^0x[1-9a-f]+[0-9a-f]*$/iu;

  const hexChainId = hexRegEx.test(String(chainId))
    ? String(chainId)
    : ethers.utils.hexlify(chainId);

  const isHexChainIdInvalid =
    typeof hexChainId === 'string' &&
    !chainIdRegEx.test(hexChainId) &&
    hexRegEx.test(hexChainId);

  return {
    valid: !isHexChainIdInvalid,
    hexChainId,
  };
};

/** eth rpc */
export const isValidChainIdForEthNetworks = (chainId: number | string) =>
  Number.isSafeInteger(chainId) && chainId > 0 && chainId <= 4503599627370476;

export const validateEthRpc = async (
  chainId: number | string,
  rpcUrl: string
): Promise<{
  valid: boolean;
  hexChainId: string;
  details: Chain;
}> => {
  try {
    if (!isValidChainIdForEthNetworks(Number(chainId)))
      throw new Error('Invalid chain ID for ethereum networks.');

    const { valid, hexChainId } = validateChainId(chainId);

    const details = typeof chainId === 'number' && chains.getById(chainId);

    const isChainIdValid = details && valid;

    if (!isChainIdValid) {
      throw new Error('RPC has an invalid chain ID');
    }

    const response = await jsonRpcRequest(rpcUrl, 'eth_chainId');

    return {
      details,
      hexChainId,
      valid: Boolean(response),
    };
  } catch (error) {
    throw new Error(error);
  }
};

export const getEthRpc = async (
  data: any
): Promise<{
  formattedNetwork: INetwork;
}> => {
  const { valid, hexChainId, details } = await validateEthRpc(
    data.chainId,
    data.rpcUrl
  );

  if (!valid) throw new Error('Invalid RPC.');

  const ethereumChain = chain.ethereum;

  const ethereumExplorer = ethereumChain.mainnet.explorers
    ? ethereumChain.mainnet.explorers[0]
    : '';

  const chainIdNumber = toDecimalFromHex(hexChainId);

  const explorer = details.explorers ? details.explorers[0] : ethereumExplorer;

  const formattedNetwork = {
    url: data.rpcUrl,
    default: false,
    label: data.label || String(details.name),
    apiUrl: data.apiUrl,
    explorer: String(explorer),
    currency: details.nativeCurrency.symbol,
    chainId: chainIdNumber,
  };

  return {
    formattedNetwork,
  };
};
/** end */

/** bitcoin-like rpc */
export const getBip44Chain = (coin: string, isTestnet?: boolean) => {
  const bip44Coin = bip44Constants.find(
    (item: any) => item[2] === (isTestnet ? bip44Constants[1][2] : coin)
  );
  const coinTypeInDecimal = bip44Coin[0];
  const symbol = bip44Coin[1];

  const { valid, hexChainId } = validateChainId(coinTypeInDecimal);

  const isChainValid = bip44Coin && valid;

  const replacedCoinTypePrefix = hexChainId.replace('0x8', '');
  const chainId = toDecimalFromHex(replacedCoinTypePrefix);

  if (!isChainValid) {
    throw new Error(
      'RPC invalid. Not found in Trezor Blockbook list of RPCS. See https://github.com/satoshilabs/slips/blob/master/slip-0044.md for available networks.'
    );
  }

  return {
    nativeCurrency: {
      name: coin,
      symbol: symbol.toString().toLowerCase(),
      decimals: 8,
    },
    coinType: coinTypeInDecimal,
    chainId,
  };
};

export const validateSysRpc = async (
  url: string
): Promise<{
  valid: boolean;
  coin: string;
  chain: string;
}> => {
  try {
    const response = await axios.get(`${url}/api/v2`);

    const {
      blockbook: { coin },
      backend: { chain },
    } = response.data;

    const valid = Boolean(response && coin);

    return {
      valid,
      coin,
      chain,
    };
  } catch (error) {
    throw new Error(error);
  }
};

export const getBip44NetworkDetails = async (rpcUrl: string) => {
  const chainDetails = await validateSysRpc(rpcUrl);

  const details = getBip44Chain(chainDetails.coin);

  return {
    ...chainDetails,
    ...details,
  };
};

export const getSysRpc = async (data: any) => {
  try {
    const { valid, coin, chain } = await validateSysRpc(data.url);
    const { nativeCurrency, chainId } = getBip44Chain(coin, chain === 'test');

    if (!valid) throw new Error('Invalid Trezor Blockbook Explorer URL');

    const formattedBitcoinLikeNetwork = getFormattedBitcoinLikeNetwork(
      chainId,
      coin
    );

    const formattedNetwork = {
      url: data.url,
      apiUrl: data.url,
      explorer: data.url,
      currency: nativeCurrency.symbol,
      label: coin,
      default: false,
      chainId,
    };

    return {
      formattedNetwork,
      formattedBitcoinLikeNetwork,
    };
  } catch (error) {
    throw new Error(error);
  }
};
/** end */
