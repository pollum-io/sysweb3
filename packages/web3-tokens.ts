import { request, gql } from 'graphql-request';
import ERC20Abi from '../abi/erc20.json';
import { web3Provider } from '../provider/web3Provider';
import { contractInstance } from '../utils/contractInstance';

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
    
    const fetchUserTokens = await request({
      url: 'https://graphql.bitquery.io/',
      document: query,
      requestHeaders: {
        'X-API-KEY': 'BQYvhnv04csZHaprIBZNwtpRiDIwEIW9',
      },
    })

    return fetchUserTokens.ethereum.address[0].balances

  } catch (error) {
    console.log(error);
  }
};

// address for test: console.log(getTokens("0xc43db41aa6649ddda4ef0ef20fd4f16be43144f7").then((r) => console.log(r)));
