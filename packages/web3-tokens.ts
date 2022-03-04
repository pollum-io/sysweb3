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
      const walletTokens = tokens.ethereum.address[0].balances;

      let finalTokens: any;

      walletTokens.map(async (token: any) => {
        const searchForToken = await axios.get(
          `https://api.coingecko.com/api/v3/search?query=${token.currency.symbol}`
        );

        const searchForEachToken = searchForToken.data.coins.filter(
          (coinGeckoToken: any) =>
            coinGeckoToken.symbol === token.currency.symbol
        );

        for (let i = 0; i < searchForEachToken.length; i++) {
          const object = {
            symbol: token.currency.symbol,
            value: token.value,
            image: searchForEachToken[i].thumb,
          };

          finalTokens.push(object);

          // return finalTokens;
          // console.log('final', finalTokens);
        }
      });

      console.log('final', finalTokens);

      // for (let i = 0; i < walletTokens.length; i++) {
      //   const searchForToken = await axios.get(
      //     `https://api.coingecko.com/api/v3/search?query=${walletTokens[i].currency.symbol}`
      //   );

      //   console.log('searchForToken', searchForToken.data.coins);

      //   const searchForEachToken = searchForToken.data.coins.filter(
      //     (token: any) => token.symbol === walletTokens[i].currency.symbol
      //   );

      //   console.log('searchForEachToken', searchForEachToken);

      //   const returnTokens = {
      //     symbol: walletTokens[i].currency.symbol,
      //     value: walletTokens[i].value,
      //     // thumbImage: searchForEachToken[0].thumb,
      //     // largeImage: searchForEachToken[0].large,
      //   };

      //   console.log('RETURNNNNN', returnTokens);

      //   // return returnTokens;
      // }

      // return tokens.ethereum.address[0].balances;
    } else {
      throw new Error('Not available tokens');
    }
  } catch (error) {
    console.log(error);
  }
};

getTokens('0xb1Ef4840213e387e5Cebcf5472d88fE9C2775dFa');
