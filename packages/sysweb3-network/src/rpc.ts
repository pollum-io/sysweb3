import axios from 'axios';
import bip44Constants from 'bip44-constants';
import { chain, chains } from 'eth-chains';
import { ethers } from 'ethers';

import { jsonRpcRequest } from './rpc-request';
import { INetwork } from '@pollum-io/sysweb3-utils';

export const isValidChainIdForEthNetworks = (chainId: number | string) =>
  Number.isSafeInteger(chainId) && chainId > 0 && chainId <= 4503599627370476;

export const validateEthRpc = async (
  chainId: number | string,
  rpcUrl: string,
  apiUrl?: string,
  label?: string
): Promise<{
  valid: boolean;
  formattedNetwork: INetwork;
  isTestnet: boolean;
}> => {
  if (!isValidChainIdForEthNetworks(Number(chainId)))
    throw new Error('Invalid chain ID for ethereum networks.');

  const hexRegEx = /^0x[0-9a-f]+$/iu;
  const chainIdRegEx = /^0x[1-9a-f]+[0-9a-f]*$/iu;
  const hexChainId = hexRegEx.test(String(chainId))
    ? String(chainId)
    : ethers.utils.hexlify(chainId);

  const isHexChainIdInvalid =
    typeof hexChainId === 'string' &&
    !chainIdRegEx.test(hexChainId) &&
    hexRegEx.test(hexChainId);

  const chainDetails = typeof chainId === 'number' && chains.getById(chainId);

  const isChainIdValid = chainDetails && !isHexChainIdInvalid;

  if (!isChainIdValid) {
    throw new Error('RPC has an invalid chain ID');
  }

  const response = await jsonRpcRequest(rpcUrl, 'eth_chainId');

  const ethereumChain = chain.ethereum;
  const ethereumExplorer = ethereumChain.mainnet.explorers
    ? ethereumChain.mainnet.explorers[0]
    : '';

  const explorer = chainDetails.explorers
    ? chainDetails.explorers[0]
    : ethereumExplorer;

  const chainIdNumber = parseInt(hexChainId, 16);

  const formattedNetwork = {
    url: rpcUrl,
    default: false,
    label: label || String(chainDetails.name),
    apiUrl,
    explorer: String(explorer),
    currency: chainDetails.nativeCurrency.symbol,
    chainId: chainIdNumber,
  };

  return {
    valid: Boolean(response),
    formattedNetwork,
    isTestnet: false,
  };
};

export const getBip44Chain = (coin: string) => {
  const isTestnetCoin = coin.includes('Testnet');
  const bip44Coin = bip44Constants.find(
    (item: any) => item[2] === (isTestnetCoin ? bip44Constants[1][2] : coin)
  );
  const coinTypeInDecimal = bip44Coin[0];
  const symbol = bip44Coin[1];

  return {
    nativeCurrency: {
      name: coin,
      symbol: symbol.toString().toLowerCase(),
      decimals: 8,
    },
    chainId: coinTypeInDecimal,
  };
};

export const validateSysRpc = async (
  rpcUrl: string,
  label?: string
): Promise<{
  valid: boolean;
  isTestnet: boolean;
  coin: string;
  formattedNetwork: INetwork;
}> => {
  const response = await axios.get(`${rpcUrl}/api/v2`);

  const {
    blockbook: { coin },
    backend: { chain },
  } = response.data;

  const valid = Boolean(response && coin);

  if (!valid) throw new Error('Invalid RPC URL');

  const { nativeCurrency, chainId } = getBip44Chain(coin);

  // sig bitcoin network

  const data = {
    url: rpcUrl,
    default: false,
    label: label || String(coin),
    apiUrl: rpcUrl,
    explorer: rpcUrl,
    currency: nativeCurrency.symbol,
    chainId,
  };

  const isTestnet = chain === 'test';

  return {
    valid,
    isTestnet,
    coin: String(coin),
    formattedNetwork: data,
    ...data,
  };
};

export const getBip44NetworkDetails = async (rpcUrl: string) => {
  const chainDetails = await validateSysRpc(rpcUrl);

  const details = getBip44Chain(chainDetails.coin);

  return {
    ...chainDetails,
    ...details,
  };
};
