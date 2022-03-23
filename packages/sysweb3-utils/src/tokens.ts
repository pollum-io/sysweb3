import axios from "axios";
import abi from "./abi/erc721.json";
import { createContractUsingAbi } from "./index";

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

export const getTokenPrice = async (tokenName: string, fiat: string) => {
  try {
    const tokenRequest = await axios
      .get(`https://api.coingecko.com/api/v3/coins/${tokenName}`)
      .then((response: any) => {
        const { price_change_24h, current_price } = response.data.market_data;

        const fiatPrice = current_price[fiat];

        return {
          current_price: fiatPrice,
          current_price_change_24h: price_change_24h,
        };
      });

    return {
      token_price: tokenRequest.current_price,
      price_change: tokenRequest.current_price_change_24h,
    };
  } catch (error) {
    return 0;
  }
};
