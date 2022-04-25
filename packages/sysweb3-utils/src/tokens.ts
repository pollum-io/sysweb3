import axios, { AxiosResponse } from 'axios';
import abi20 from './abi/erc20.json';
import abi from './abi/erc721.json';
import tokens from './tokens.json';
import { IEthereumAddress, createContractUsingAbi } from '.';

/**
 *
 * @param contract Address of the token contract
 * @param tokenId ID of the token
 * @returns the link of the image for the given token
 */
export const getNftImage = async (
  contract: string,
  tokenId: number
): Promise<string> => {
  try {
    const nft = await (await createContractUsingAbi(abi, contract)).methods
      .tokenURI(tokenId)
      .call();

    if (nft) {
      const ipfsUrl = String(nft).replace('ipfs://', 'https://ipfs.io/ipfs/');

      const url = await axios.get(ipfsUrl);

      return String(url.data.image).replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    throw new Error('NFTinfo not found.');
  } catch (error) {
    console.log(
      'Verify current network. Set the same network of NFT contract.'
    );
    throw error;
  }
};

export const getTokenIconBySymbol = async (
  symbol: string
): Promise<string | undefined> => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${symbol.toUpperCase()}`
    );

    const tokens = response.data.coins.filter((token: any) => {
      return token.symbol.toUpperCase() === symbol.toLocaleUpperCase();
    });

    if (tokens) {
      return tokens[0].thumb;
    }
  } catch (error) {
    throw new Error('Token icon not found');
  }
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
): Promise<{
  price: number;
  priceChange: number;
}> => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${token}`
    );

    const { price_change_24h, current_price } = response.data.market_data;

    return {
      price: current_price[fiat],
      priceChange: price_change_24h,
    };
  } catch (error) {
    throw new Error(`Unable to find a value of ${token} as ${fiat}`);
  }
};

/**
 * Get token symbol by chain
 * @param chain should be written in lower case and by extense
 * @example 'ethereum' | 'syscoin'
 */
export const getSymbolByChain = async (chain: string): Promise<string> => {
  const { data } = await axios.get(
    `https://api.coingecko.com/api/v3/coins/${chain}`
  );

  return data.symbol.toString().toUpperCase();
};

export const getTokenBySymbol = async (
  symbol: string
): Promise<{
  symbol: string;
  icon: string;
  description: string;
  contract: string;
}> => {
  const {
    data: { symbol: _symbol, contract_address, description, image },
  } = await axios.get(
    `https://api.coingecko.com/api/v3/search?query=${symbol}`
  );

  const symbolToUpperCase = _symbol.toString().toUpperCase();

  return {
    symbol: symbolToUpperCase,
    icon: image.small,
    description: description.en,
    contract: contract_address,
  };
};

export const getSearch = async (query: string): Promise<AxiosResponse> => {
  return await axios.get(
    `https://api.coingecko.com/api/v3/search?query=${query}`
  );
};

/**
 *
 * @param tokenAddress Contract address of the token to get info from
 */
export const importWeb3Token = async (
  tokenAddress: string
): Promise<EthTokenDetails> => {
  try {
    const contract = await createContractUsingAbi(abi20, tokenAddress);

    const [tokenDecimals, tokenName, tokenSymbol]: IErc20Token[] =
      await Promise.all([
        contract.methods.decimals().call(),
        contract.methods.name().call(),
        contract.methods.symbol().call(),
      ]);

    const validToken = tokenDecimals && tokenName && tokenSymbol;

    if (validToken) {
      const {
        data: {
          id,
          description: { en: description },
        },
      } = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${tokenName
          .toString()
          .toLowerCase()}`
      );

      return {
        id,
        symbol: String(tokenSymbol),
        name: String(tokenName),
        decimals: Number(tokenDecimals),
        description,
        contract: tokenAddress,
      };
    }

    return {} as EthTokenDetails;
  } catch (error) {
    throw new Error('Token not found, verify the Token Contract Address.');
  }
};

/**
 *
 * @param address Contract address of the token to validate
 */
export const validateToken = async (
  address: string
): Promise<IErc20Token | Error> => {
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
        name: String(name),
        symbol: String(symbol),
        decimals: Number(decimals),
      };
    }

    return new Error('Invalid token');
  } catch (error) {
    throw new Error('Token not found, verify the Token Contract Address.');
  }
};

export const getTokenJson = () => tokens;

/** types */
export type EthTokenDetails = {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  description: string;
  contract: string;
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
  timeStamp: string;
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

export type ITokenMap = Map<string, IAddressMap>;
/** end */
