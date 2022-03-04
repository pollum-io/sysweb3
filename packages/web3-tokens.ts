import { request, gql } from 'graphql-request';
import axios from 'axios';

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

    const tokens = await request({
      url: 'https://graphql.bitquery.io/',
      document: query,
      requestHeaders: {
        'X-API-KEY': 'BQYvhnv04csZHaprIBZNwtpRiDIwEIW9',
      },
    });

    if (tokens.ethereum.address[0].balances) {
      const tokensInUserWallet: any[] = tokens.ethereum.address[0].balances;

      return tokensInUserWallet;
    } else {
      throw new Error('Not available tokens');
    }
  } catch (error) {
    console.log(error);
  }
};

const getTokenIconBySymbol = async (symbol: string) => {
  const generalSearchForToken = await axios.get(
    `https://api.coingecko.com/api/v3/search?query=${symbol}`
  );

  const getSpecificToken = generalSearchForToken.data.coins.filter(
    (token: any) => {
      return token.symbol === symbol;
    }
  );

  const { thumb, large } = getSpecificToken[0];

  return { thumbImage: thumb, largeImage: large };
};
