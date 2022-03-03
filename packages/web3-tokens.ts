import { request, gql } from 'graphql-request';
import ERC20Abi from '../abi/erc20.json';
import { web3Provider } from '../provider/web3Provider';
import { contractInstance } from '../utils/contractInstance';

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

export const getTokens = async (walletAddress) => {
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

    const { ethereum } = await request({
      url: 'https://graphql.bitquery.io/',
      document: query,
      requestHeaders: {
        'X-API-KEY': 'BQYvhnv04csZHaprIBZNwtpRiDIwEIW9',
      },
    });

    if (ethereum.address[0].balances) {
      return ethereum.address[0].balances;
    } else {
      return new Error('Not available tokens');
    }
  } catch (error) {
    console.log(error);
  }
};


// console.log(
//   getTokens('0xc43db41aa6649ddda4ef0ef20fd4f16be43144f7').then((r) =>
//     console.log(r)
//   )
// );
