import { IEthereumAddress, createContractUsingAbi } from ".";
import axios from "axios";
import abi from "./abi/erc721.json";

export const getNftImage = async (contract: string, tokenId: number) => {
  try {
    const nft = await (await createContractUsingAbi(abi, contract)).methods
      .tokenURI(tokenId)
      .call();

    if (nft) {
      const ipfsUrl = String(nft).replace("ipfs://", "https://ipfs.io/ipfs/");

      const url = await axios.get(ipfsUrl);

      /**
       * 'https://gateway.pinata.cloud/ipfs/Qmc4DqK9xeoSvtVmTcS6YG3DiWHyfiwQsnwQfzcqAvtmHj'
       */

      return String(url.data.image).replace("ipfs://", "https://ipfs.io/ipfs/");
    }

    throw new Error("NFTinfo not found.");
  } catch (error) {
    console.log(
      "Verify current network. Set the same network of NFT contract."
    );
    throw error;
  }
};

export const getTokenIconBySymbol = async (symbol: string) => {
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${symbol.toUpperCase()}`
    );

    const tokens = response.data.coins.filter((token: any) => {
      return token.symbol.toUpperCase() === symbol.toLocaleUpperCase();
    });

    if (tokens) {
      /**
       *   {
              thumbImage: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png',
              largeImage: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' 
            }
       */
      return tokens[0].thumb;
    }
  } catch (error) {
    // todo: handle
    throw new Error("Token icon not found");
  }
};

export const isNFT = (guid: number) => {
  const assetGuid = BigInt.asUintN(64, BigInt(guid));

  return assetGuid >> BigInt(32) > 0;
};

export const getHost = (url: string) => {
  if (typeof url === "string" && url !== "") {
    return new URL(url).host;
  }

  return url;
};

/**
 * Converts a token to a fiat value
 * @param token example `syscoin`
 * @param fiat example `usd`. 3 letter code. All lower case
 */
export const getFiatValueByToken = async (token: string, fiat: string) => {
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
 * @param chain example `ethereum`
 */
export const getSymbolByChain = async (chain: string) => {
  const { data } = await axios.get(
    `https://api.coingecko.com/api/v3/coins/${chain}`
  );

  return data.symbol.toString().toUpperCase();
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
  SYS = "SYS",
  ETH = "ETH",
  ERC20 = "ERC20",
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
