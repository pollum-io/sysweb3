import bip44Constants from 'bip44-constants';
import { Chain, chains } from 'eth-chains';
import { ethers } from 'ethers';

// import fetch from "node-fetch";

import { getNetworkConfig, toDecimalFromHex, INetwork } from './networks';

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
  Number.isSafeInteger(chainId) &&
  Number(chainId) > 0 &&
  Number(chainId) <= 4503599627370476;

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
    const web3Provider = new ethers.providers.JsonRpcProvider(url);
    const { chainId } = await web3Provider.getNetwork();
    if (!chainId) {
      throw new Error('Invalid RPC URL. Could not get chain ID for network.');
    }

    if (!isValidChainIdForEthNetworks(Number(chainId))) {
      throw new Error('Invalid chain ID for ethereum networks.');
    }

    const { valid, hexChainId } = validateChainId(chainId);
    const details = chains.getById(chainId);
    if (!valid) {
      throw new Error('RPC has an invalid chain ID');
    }

    return {
      chainId,
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
    const formatURL = `${url.endsWith('/') ? url.slice(0, -1) : url}/api/v2`;
    const response = await (await fetch(formatURL)).json();
    const {
      blockbook: { coin },
      backend: { chain },
    } = response;

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

// TODO: type data with ICustomRpcParams later
// TODO: type return correctly
export const getSysRpc = async (data: any) => {
  try {
    const { valid, coin, chain } = await validateSysRpc(data.url);
    const { nativeCurrency, chainId } = getBip44Chain(coin, chain === 'test');
    let explorer: string | undefined = data.explorer;

    if (!valid) throw new Error('Invalid Trezor Blockbook Explorer URL');

    const networkConfig = getNetworkConfig(chainId, coin);
    if (!explorer) {
      //We accept only trezor blockbook for UTXO chains, this method won't work for non trezor apis
      explorer = data.url.replace(/\/api\/v[12]/, ''); //trimming /api/v{number}/ from explorer
    }
    const networkType = chain === 'test' ? 'testnet' : 'mainnet';
    const formattedNetwork = {
      url: data.url,
      apiUrl: data.url, //apiURL and URL are the same for blockbooks explorer TODO: remove this field from UTXO networks
      explorer,
      currency: nativeCurrency.symbol,
      label: data.label || coin,
      default: false,
      chainId,
      slip44: networkConfig.networks[networkType].slip44,
    };
    const rpc = {
      formattedNetwork,
      networkConfig,
    };

    return { rpc, coin, chain };
  } catch (error) {
    throw new Error(error);
  }
};
/** end */
