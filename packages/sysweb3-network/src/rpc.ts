import axios from 'axios';
import bip44Constants from 'bip44-constants';
import { Chain, chains } from 'eth-chains';
import { ethers } from 'ethers';

import { getFormattedBitcoinLikeNetwork, toDecimalFromHex } from './networks';
import { jsonRpcRequest } from './rpc-request';
import { INetwork } from '@pollum-io/sysweb3-utils';

const hexRegEx = /^0x[0-9a-f]+$/iu;

export const validateChainId = (
  chainId: number | string
): { valid: boolean; hexChainId: string } => {
  const hexChainId = ethers.utils.hexlify(chainId);

  const isHexChainIdValid =
    typeof hexChainId === 'string' && hexRegEx.test(hexChainId);

  return {
    valid: isHexChainIdValid,
    hexChainId,
  };
};

/** eth rpc */
export const isValidChainIdForEthNetworks = (chainId: number | string) =>
  Number.isSafeInteger(chainId) && chainId > 0 && chainId <= 4503599627370476;

export const validateEthRpc = async (
  url: string
): Promise<{
  chainId: number;
  valid: boolean;
  hexChainId: string;
  details: Chain | undefined;
  chain: string;
}> => {
  try {
    const chainId = await jsonRpcRequest(url, 'eth_chainId');
    if (!chainId) {
      throw new Error('Invalid RPC URL. Could not get chain ID for network.');
    }
    const numberChainId = parseInt(chainId, 16);
    if (!isValidChainIdForEthNetworks(Number(numberChainId)))
      throw new Error('Invalid chain ID for ethereum networks.');
    const { valid, hexChainId } = validateChainId(numberChainId);
    const details = chains.getById(numberChainId);
    if (!valid) {
      throw new Error('RPC has an invalid chain ID');
    }

    return {
      chainId: numberChainId,
      details,
      chain: details && details.chain ? details.chain : 'unknown',
      hexChainId,
      valid,
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
  const { valid, hexChainId, details } = await validateEthRpc(data.url);

  if (!valid) throw new Error('Invalid RPC.');

  const chainIdNumber = toDecimalFromHex(hexChainId);
  let explorer = '';
  if (details) {
    explorer = details.explorers ? details.explorers[0].url : explorer;
  }
  if (!details && !data.symbol) throw new Error('Must define a symbol');
  const formattedNetwork = {
    url: data.url,
    default: false,
    label: data.label || String(details ? details.name : ''),
    apiUrl: data.apiUrl,
    explorer: data.explorer ? data.explorer : String(explorer),
    currency: details ? details.nativeCurrency.symbol : data.symbol,
    chainId: chainIdNumber,
  };

  return {
    formattedNetwork,
  };
};
/** end */

/** bitcoin-like rpc */
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

// review keyring manager
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

// change setsignerbychain keyring manager
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
