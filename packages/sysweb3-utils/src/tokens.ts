import axios from 'axios';
import camelcaseKeys from 'camelcase-keys';
import sys from 'syscoinjs-lib';

import { createContractUsingAbi } from '.';
import abi20 from './abi/erc20.json';
import tokens from './tokens.json';
import { web3Provider } from '@pollum-io/sysweb3-network';

import type { Contract, ContractFunction } from '@ethersproject/contracts';
import type { BaseProvider, JsonRpcProvider } from '@ethersproject/providers';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Some NFT minting services misinterpreted the JSON schema from the EIP as
// literal JSON, e.g. portion.io:
// https://ipfs.io/ipfs/QmNt5T9HSXKLXZ3kmciU4Tm6q9R8JEm5ifJkPoxapjyRUR
type NftMetadataMixedInJsonSchema = {
  title: string;
  type: 'object';
  properties: {
    name: { type: 'string'; description: string };
    image: { type: 'string'; description: string };
    description: { type: 'string'; description: string };
  };
};

const RARIBLE_MATCH_RE =
  /^https:\/\/rarible\.com\/token\/(0x[a-fA-F0-9]{40}):([0-9]+)/;

export function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function identity<T = unknown>(arg: T): T {
  return arg;
}

export function parseNftUrl(url: string): [string, string] | null {
  const raribleMatch = RARIBLE_MATCH_RE.exec(url);
  if (raribleMatch) {
    return [raribleMatch[1], raribleMatch[2]];
  }
  return null;
}

export function fetchImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = src;
    image.crossOrigin = '';
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
  });
}

// Scale the image and add some extra padding. Returns the image as base64.
// The padding and scale are expressed as proportions of the image size.
export function frameImage(
  image: HTMLImageElement,
  { scale = 1, padding = 0 } = {}
): string | null {
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const _padding = Math.max(width * padding, height * padding);

  const canvas = document.createElement('canvas');
  canvas.width = width + _padding * 2;
  canvas.height = height + _padding * 2;

  const ctx = canvas.getContext('2d');
  if (ctx === null) {
    return null;
  }

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, _padding, _padding, width, height);

  return canvas.toDataURL();
}

export function ipfsUrlDefault(cid: string, path = ''): string {
  return `https://ipfs.io/ipfs/${cid}${path}`;
}

const IPFS_PROTOCOL_RE = /^ipfs:\/\/(?:ipfs\/)?([^/]+)(\/.+)?$/;
const IPFS_HASH_RE = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

export function ipfsUrlFromString(
  ipfsString: string,
  ipfsUrl: IpfsUrlFn
): string {
  // ipfs:// URI
  const ipfsProtocolMatch = IPFS_PROTOCOL_RE.exec(ipfsString);
  if (ipfsProtocolMatch) {
    const [, cid, path = ''] = ipfsProtocolMatch;
    return ipfsUrl(cid, path);
  }

  // standalone cid, probably
  if (IPFS_HASH_RE.test(ipfsString)) {
    return ipfsUrl(ipfsString);
  }

  // maybe URL
  return ipfsString;
}

export function normalizeOpenSeaUrl(url: string, tokenId: string): string {
  // url can be anything so we need to try / catch to pass it to new URL()
  try {
    const _url = new URL(url);

    // 0x%7Bid%7D" = 0x{id} (url encoded)
    if (
      (_url.host !== 'api.opensea.io' &&
        _url.host !== 'testnets-api.opensea.io') ||
      !_url.pathname.includes('0x%7Bid%7D')
    ) {
      return url;
    }

    _url.pathname = _url.pathname.replace(/0x%7Bid%7D/g, tokenId);
    _url.searchParams.set('format', 'json');

    return String(_url);
  } catch (err) {
    return url;
  }
}

export function normalizeNiftyGatewayUrl(url: string): string {
  try {
    const _url = new URL(url);

    if (_url.host !== 'api.niftygateway.com') {
      return url;
    }

    // Without final slash, the Nifty Gateway API server
    // doesn’t set the CORS headers properly.
    _url.pathname = _url.pathname + '/';
    return String(_url);
  } catch (err) {
    return url;
  }
}

export const normalizeTokenUrl = (url: string): string =>
  String(url).replace('ipfs://', 'https://ipfs.io/ipfs/');

export function normalizeImageUrl(
  url: string,
  fetchContext: FetchContext
): string {
  return ipfsUrlFromString(url, fetchContext.ipfsUrl);
}

export function normalizeNftMetadata(
  data: NftJsonMetadata,
  fetchContext: FetchContext
): NftJsonMetadata {
  return {
    ...data,
    image: normalizeImageUrl(data.image, fetchContext),
  };
}

const ABI = [
  // ERC-721
  'function tokenURI(uint256 _tokenId) external view returns (string)',
  'function ownerOf(uint256 _tokenId) external view returns (address)',
  // ERC-1155
  'function uri(uint256 _id) external view returns (string)',
];

type NftContract = InstanceType<typeof Contract> & {
  ownerOf: ContractFunction<string>;
  tokenURI: ContractFunction<string>;
  uri: ContractFunction<string>;
};

async function url(contract: NftContract, tokenId: string): Promise<string> {
  const uri = await promiseAny([
    contract.tokenURI(tokenId),
    contract.uri(tokenId),
  ]).catch((errors) => {
    throw new MultipleErrors(
      'An error occurred while trying to fetch the token URI from the NFT' +
        ' contract. See the “errors” property on this error for details.',
      errors
    );
  });
  return normalizeTokenUrl(uri);
}

export async function fetchStandardNftContractData(
  contractAddress: Address,
  tokenId: string,
  config: EthersFetcherConfigEthersLoaded
): Promise<NftMetadata> {
  const contract = new config.ethers.Contract(
    contractAddress,
    ABI,
    config.provider
  ) as NftContract;

  const [metadataUrl, owner] = await Promise.all([
    url(contract, tokenId),
    contract.ownerOf(tokenId).catch(() => ''),
  ]);

  const metadata = await fetchMetadata(metadataUrl);
  const imageType = urlExtensionType(metadata.image);

  return {
    ...metadata,
    imageType,
    metadataUrl,
    owner,
  };
}

const ETHERS_NOT_FOUND =
  'Ethers couldn’t be imported. ' +
  'Please add the ethers module to your project dependencies, ' +
  'or inject it in the Ethers fetcher options.';

async function loadEthers(
  config: EthersFetcherConfig
): Promise<EthersFetcherConfigEthersLoaded> {
  if (config.ethers?.Contract) {
    return config as EthersFetcherConfigEthersLoaded;
  }

  try {
    const ethers = await import('@ethersproject/contracts').then(
      (m) => m?.default ?? m
    );
    if (!ethers?.Contract) {
      throw new Error();
    }
    return { ...config, ethers };
  } catch (err) {
    throw new Error(ETHERS_NOT_FOUND);
  }
}

export default function ethersFetcher(
  config: EthersFetcherConfig
): EthersFetcher {
  return {
    config,
    async fetchNft(
      contractAddress: Address,
      tokenId: string
    ): Promise<NftMetadata> {
      if (!isAddress(contractAddress)) {
        throw new Error(`Invalid contract address: ${contractAddress}`);
      }
      const configWithEthersLoaded = await loadEthers(config);
      const metadata = await fetchStandardNftContractData(
        contractAddress,
        tokenId,
        configWithEthersLoaded
      );
      return metadata;
    },
  };
}

export function fixIncorrectImageField(
  data: Record<string, unknown>
): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const _data = data as {
    image: string;
    imageUrl: string;
  };

  // makersplace.com is using `imageUrl` rather than `image`
  if (
    typeof _data?.image === 'undefined' &&
    typeof _data?.imageUrl === 'string'
  ) {
    return { ..._data, image: _data?.imageUrl };
  }

  return data;
}

// See NftMetadataMixedInJsonSchema for why this is needed.
export function isNftMetadataMixedInJsonSchema(
  data: unknown
): data is NftMetadataMixedInJsonSchema {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const _data = data as NftMetadataMixedInJsonSchema;
  return (
    _data.title === 'Asset Metadata' &&
    _data.type === 'object' &&
    typeof _data.properties?.name?.description === 'string' &&
    typeof _data.properties?.image?.description === 'string' &&
    typeof _data.properties?.description?.description === 'string' &&
    _data.properties?.name?.type === 'string' &&
    _data.properties?.image?.type === 'string' &&
    _data.properties?.description?.type === 'string'
  );
}

export function fixNftMetadataMixedInJsonSchema(
  data: NftMetadataMixedInJsonSchema
): NftJsonMetadata {
  return {
    name: data.properties?.name?.description || '',
    description: data.properties?.description?.description || '',
    image: data.properties?.image?.description || '',
    rawData: { ...data },
  };
}

export function isNftMetadata(data: unknown): data is NftMetadata {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const _data = data as NftMetadata;

  // We don’t test for the exact type here, because some NFT minting services
  // set some of the fields as null.
  // We also only test for the presence of either `name` or `image`, as some
  // NFT formats don’t declare them all (e.g. BAYC only declares `image`).
  return 'name' in _data || 'image' in _data;
}

export function addressesEqual(addr1: Address, addr2: Address): boolean {
  return addr1?.toLowerCase() === addr2?.toLowerCase();
}

// Promise.any() implementation from https://github.com/m0ppers/promise-any
export function promiseAny<T>(promises: Promise<T>[]): Promise<T> {
  return reversePromise(
    Promise.all([...promises].map(reversePromise))
  ) as Promise<T>;
}
export function reversePromise(promise: Promise<unknown>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    Promise.resolve(promise).then(reject, resolve);
  });
}

// To replace with AggregateError when useNft() will target ES2021 environments
export class MultipleErrors extends Error {
  errors: Error[];
  constructor(message: string, errors: Error[]) {
    super(message);
    this.name = 'MultipleErrors';
    this.errors = errors;
  }
}

const IMAGE_EXT_RE = /\.(?:png|svg|jpg|jepg|gif|webp|jxl|avif)$/;
const VIDEO_EXT_RE = /\.(?:mp4|mov|webm|ogv)$/;

// Guess a file type from the extension used in a URL
export function urlExtensionType(url: string): NftMetadata['imageType'] {
  if (IMAGE_EXT_RE.test(url)) return 'image';
  if (VIDEO_EXT_RE.test(url)) return 'video';
  return 'unknown';
}

export async function fetchMetadata(url: string): Promise<NftJsonMetadata> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Error when trying to request ${url}`);
  }

  let rawData;

  try {
    rawData = (await response.json()) as Record<string, unknown>;
  } catch (error) {
    // If it can’t be parsed as JSON, it must be an image URL
    rawData = { name: '', description: '', image: url };
  }

  let data = { ...rawData };

  if (isNftMetadataMixedInJsonSchema(data)) {
    data = fixNftMetadataMixedInJsonSchema(data);
  }

  data = fixIncorrectImageField(data);

  if (!isNftMetadata(data)) {
    throw new Error('Invalid data received');
  }

  return {
    description: data.description || '',
    image: data.image || '',
    name: data.name || '',
    rawData,
  };
}

export const getNftImage = async (contractAddress: string, tokenId: string) => {
  try {
    const { config, fetchNft } = ethersFetcher({ provider: web3Provider });
    const loaded = await loadEthers(config);
    const nft = fetchStandardNftContractData(contractAddress, tokenId, loaded);
    const fetchNFT = await fetchNft(contractAddress, tokenId);
    console.log({ nft, fetchNFT, loaded });
  } catch (error) {
    console.error(
      'Verify current network. Set the same network of NFT contract.'
    );

    throw new Error(error);
  }
};

export const getTokenIconBySymbol = async (symbol: string): Promise<string> => {
  symbol = symbol.toUpperCase();
  const searchResults = await getSearch(symbol);

  const tokens = searchResults.coins.filter(
    (token: any) => token.symbol.toUpperCase() === symbol
  );

  if (tokens[0]) return tokens[0].thumb;
  else throw new Error('Token icon not found');
};

export const isNFT = (guid: number) => {
  const assetGuid = BigInt.asUintN(64, BigInt(guid));

  return assetGuid >> BigInt(32) > 0;
};

export const getHost = (url: string) => {
  if (typeof url === 'string' && url !== '') {
    return new URL(url).host;
  }

  return url;
};

export const getToken = async (id: string): Promise<ICoingeckoToken> => {
  let token;
  try {
    const response = await axios.get(`${COINGECKO_API}/coins/${id}`);
    token = response.data;
  } catch (error) {
    throw new Error('Unable to retrieve token data');
  }

  return camelcaseKeys(token, { deep: true });
};

/**
 * Converts a token to a fiat value
 *
 * Parameters should be all lower case and written by extense
 *
 * @param token Token to get fiat price from
 * @param fiat Fiat to convert token price to, should be a {@link [ISO 4217 code](https://docs.1010data.com/1010dataReferenceManual/DataTypesAndFormats/currencyUnitCodes.html)}
 * @example 'syscoin' for token | 'usd' for fiat
 */
export const getFiatValueByToken = async (
  token: string,
  fiat: string
): Promise<number> => {
  try {
    const response = await axios.get(
      `${COINGECKO_API}/simple/price?ids=${token}&vs_currencies=${fiat}`
    );

    return response.data[token][fiat];
  } catch (error) {
    throw new Error(`Unable to retrieve ${token} price as ${fiat} `);
  }
};

/**
 * Get token symbol by chain
 * @param chain should be written in lower case and by extense
 * @example 'ethereum' | 'syscoin'
 */
export const getSymbolByChain = async (chain: string): Promise<string> => {
  const { symbol } = await getToken(chain);

  return symbol.toUpperCase();
};

export const getTokenBySymbol = async (
  symbol: string
): Promise<ICoingeckoSearchResultToken> => {
  const searchResults = await getSearch(symbol);
  const firstCoin = searchResults.coins[0];

  const symbolsAreEqual =
    firstCoin.symbol.toUpperCase() === symbol.toUpperCase();

  if (symbolsAreEqual) return firstCoin;
  else throw new Error('Unable to find token');
};

export const getSearch = async (
  query: string
): Promise<ICoingeckoSearchResults> => {
  const response = await axios.get(`${COINGECKO_API}/search?query=${query}`);

  return camelcaseKeys(response.data, { deep: true });
};

/**
 *
 * @param contractAddress Contract address of the token to get info from
 */
export const getTokenByContract = async (
  contractAddress: string
): Promise<ICoingeckoToken> => {
  let token;
  try {
    const response = await axios.get(
      `${COINGECKO_API}/coins/ethereum/contract/${contractAddress}`
    );
    token = response.data;
  } catch (error) {
    throw new Error('Token not found');
  }

  return camelcaseKeys(token, { deep: true });
};

/**
 *
 * @param address Contract address of the token to validate
 */
export const validateToken = async (
  address: string
): Promise<IErc20Token | any> => {
  try {
    const contract = await createContractUsingAbi(abi20, address);

    const [decimals, name, symbol]: IErc20Token[] = await Promise.all([
      contract.methods.decimals().call(),
      contract.methods.name().call(),
      contract.methods.symbol().call(),
    ]);

    const validToken = decimals && name && symbol;

    if (validToken) {
      return {
        name: String(name),
        symbol: String(symbol),
        decimals: Number(decimals),
      };
    }

    return console.error('Invalid token');
  } catch (error) {
    return console.error('Token not found, verify the Token Contract Address.');
  }
};

export const getTokenJson = () => tokens;

export const getAsset = async (
  explorerUrl: string,
  assetGuid: string
): Promise<{
  assetGuid: string;
  contract: string;
  decimals: number;
  maxSupply: string;
  pubData: any;
  symbol: string;
  totalSupply: string;
  updateCapabilityFlags: number;
}> => sys.utils.fetchBackendAsset(explorerUrl, assetGuid);

export const countDecimals = (x: number) => {
  if (Math.floor(x) === x) return 0;

  return x.toString().split('.')[1].length || 0;
};

/** types */

// the source is in snake case
export interface ICoingeckoToken {
  id: string;
  symbol: string;
  name: string;
  assetPlatformId: string;
  platforms: object;
  blockTimeInMinutes: number;
  hashingAlgorithm?: string;
  categories: string[];
  localization: object;
  description: object;
  links: object;
  image: {
    thumb: string;
    small: string;
    large: string;
  };
  countryOrigin: string;
  genesisDate?: string;
  contractAddress?: string;
  sentimentVotesUpPercentage: number;
  sentimentVotesDownPercentage: number;
  icoData?: object;
  marketCapRank: number;
  coingeckoRank: number;
  coingeckoScore: number;
  developerScore: number;
  communityScore: number;
  liquidityScore: number;
  publicInterestScore: number;
  marketData: {
    currentPrice: { [fiat: string]: number };
    marketCap: { [fiat: string]: number };
    totalVolume: { [fiat: string]: number };
    fullyDilutedValuation: object;
    totalValueLocked?: object;
    fdvToTvlRatio?: number;
    mcapToTvlRatio?: number;
    circulatingSupply: number;
    totalSupply?: number;
    maxSupply?: number;
    priceChange24H: number;
  };
  communityData: object;
  developerData: object;
  publicInterestStats: object;
  lastUpdated: string;
  tickers: object[];
}

export interface ICoingeckoSearchResultToken {
  id: string;
  name: string;
  symbol: string;
  marketCapRank: number;
  thumb: string;
  large: string;
}

export interface ICoingeckoSearchResults {
  coins: ICoingeckoSearchResultToken[];
  exchanges: object[];
  icos: object[];
  categories: object[];
  nfts: object[];
}

export type EthTokenDetails = {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  description: string;
  contract: string;
};

export type IEthereumAddress = {
  address: IEthereumBalance[];
};

export type IEthereumBalance = {
  balances: IEthereumCurrency[];
};

export type IEthereumCurrency = {
  currency: {
    symbol: string;
  };
  value: number;
};

export type IEthereumTokensResponse = {
  ethereum: IEthereumAddress;
};

export type IEthereumToken = {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number;
  thumb: string;
  large: string;
};

export type TokenIcon = {
  thumbImage: string;
  largeImage: string;
};

export type IEthereumNft = {
  blockNumber: string;
  timestamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  tokenID: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
};

export type IErc20Token = {
  name: string;
  symbol: string;
  decimals: number;
};

export enum IKeyringTokenType {
  SYS = 'SYS',
  ETH = 'ETH',
  ERC20 = 'ERC20',
}

export type ISyscoinToken = {
  type: string;
  name: string;
  path: string;
  tokenId: string;
  transfers: number;
  symbol: string;
  decimals: number;
  balance: number;
  totalReceived: string;
  totalSent: string;
};

export type IAddressMap = {
  changeAddress: string;
  outputs: [
    {
      value: number;
      address: string;
    }
  ];
};

export type EthersContract = typeof Contract;

export type EthersFetcherConfig = {
  ethers?: { Contract: EthersContract };
  provider: BaseProvider | JsonRpcProvider;
};

export type EthersFetcherConfigEthersLoaded = EthersFetcherConfig & {
  ethers: { Contract: EthersContract };
};

export type EthersFetcher = Fetcher<EthersFetcherConfig>;
export type EthereumProviderEip1193 = {
  request: (args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
};

export type EthereumFetcherConfigDeclaration = {
  ethereum?: EthereumProviderEip1193;
};

export type EthereumFetcherConfig = {
  ethereum: EthereumProviderEip1193;
};

export type EthereumFetcher = Fetcher<EthereumFetcherConfig>;

export type Address = string;

export type NftResultLoading = {
  status: 'loading';
  loading: true;
  error: undefined;
  nft: undefined;
  reload: () => Promise<boolean>;
};

export type NftResultError = {
  status: 'error';
  loading: false;
  error: Error;
  nft: undefined;
  reload: () => Promise<boolean>;
};

export type NftResultDone = {
  status: 'done';
  loading: false;
  error: undefined;
  nft: NftMetadata;
  reload: () => Promise<boolean>;
};

export type NftResult = NftResultLoading | NftResultError | NftResultDone;

export type NftMetadata = {
  description: string;
  image: string;
  imageType: 'image' | 'video' | 'unknown';
  metadataUrl: string;
  name: string;
  owner: Address;
  rawData: Record<string, unknown> | null;
};

export type NftJsonMetadata = {
  description: string;
  image: string;
  name: string;
  rawData: Record<string, unknown> | null;
};

export type ContractMethod = {
  address: string;
  methodName: string;
  methodHash: string;
  humanReadableAbi: [string];
};

export type Fetcher<Config> = {
  config: Config;
  fetchNft: (contractAddress: Address, tokenId: string) => Promise<NftMetadata>;
};

export type FetcherDeclarationEthers = ['ethers', EthersFetcherConfig];
export type FetcherDeclarationEthereum = [
  'ethereum',
  EthereumFetcherConfigDeclaration
];
export type FetcherDeclaration =
  | FetcherDeclarationEthers
  | FetcherDeclarationEthereum;

export type FetcherProp = Fetcher<unknown> | FetcherDeclaration;

export type ImageProxyFn = (url: string, metadata: NftMetadata) => string;
export type JsonProxyFn = (url: string) => string;
export type IpfsUrlFn = (cid: string, path?: string) => string;

export type FetchContext = {
  imageProxy: ImageProxyFn;
  ipfsUrl: IpfsUrlFn;
  jsonProxy: JsonProxyFn;
};

export type ITokenMap = Map<string, IAddressMap>;
/** end */
