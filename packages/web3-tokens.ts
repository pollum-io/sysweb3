import { request, gql } from 'graphql-request';
import axios from 'axios';
import { IEthereum } from '../types/IEthereum';
import { IToken } from '../types/IToken';

/**
 * This function should return an array with all available currencies of provide wallet.
 * 
 * @param walletAddress
 * 
 * Use example: 
 * 
 * ```
 * <button onClick={getTokens('0x00000000000000000000000')}>Get all available tokens!</button>
 * ```
 * 
 * Example of return array:
 * 
 * ```
 * [
      { currency: { symbol: '1INCH' }, value: 12 },
      { currency: { symbol: 'USDT' }, value: 4 },
      { currency: { symbol: 'ETH' }, value: 184.421239 },
      { currency: { symbol: 'KP3R' }, value: 7 },
      { currency: { symbol: 'steCRV' }, value: 0 },
      { currency: { symbol: 'UNI-V2' }, value: 0 },
    ]
```
 *
 */

export const getTokens = async (walletAddress: string) => {
  try {
    const query = gql`
      {
        ethereum {
          address(
            address: { is: "${walletAddress}" }
          ) {
            balances {
              currency {
                symbol
              }
              value
            }
          }
        }
      }
    `;

    const tokens: IEthereum = await request({
      url: 'https://graphql.bitquery.io/',
      document: query,
      requestHeaders: {
        'X-API-KEY': 'BQYvhnv04csZHaprIBZNwtpRiDIwEIW9',
      },
    });

    if (tokens.ethereum.address[0].balances) {
      return tokens.ethereum.address[0].balances;
    } else {
      throw new Error('Not available tokens');
    }
  } catch (error) {
    console.log(error);
  }
};

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
      throw new Error('Token icon not found');
    }
  } catch (error) {
    console.log(error);
  }
};

getTokenIconBySymbol('eth');
