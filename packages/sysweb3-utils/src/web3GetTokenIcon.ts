import axios from "axios";
import { IToken } from "../../sysweb3-types/src/index";

/**
 * This function should return an object with 2 parameters that will be the thumb image  url and large image url
 * 
 * @param symbol
 * 
 * Use example: 
 * 
 * ```
 * <image src={getTokenIconBySymbol('eth')} />
 * ```
 * 
 * Example of return object:
 * 
 * ```
 * 
  {
    thumbImage: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png',
    largeImage: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' 
  }
```
 *
 */

export const getTokenIconBySymbol = async (symbol: string) => {
  try {
    const generalSearchForToken = await axios.get(
      `https://api.coingecko.com/api/v3/search?query=${symbol.toUpperCase()}`
    );

    const getSpecificToken: IToken[] = generalSearchForToken.data.coins.filter(
      (token: any) => {
        return token.symbol.toUpperCase() === symbol.toLocaleUpperCase();
      }
    );

    if (getSpecificToken) {
      return getSpecificToken[0].thumb;
    } else {
      throw new Error("Token icon not found");
    }
  } catch (error) {
    console.log(error);
  }
};
