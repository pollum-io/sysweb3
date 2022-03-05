"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenIconBySymbol = exports.getTokens = void 0;
const graphql_request_1 = require("graphql-request");
const axios_1 = __importDefault(require("axios"));
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
const getTokens = (walletAddress) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = (0, graphql_request_1.gql) `
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
        const tokens = yield (0, graphql_request_1.request)({
            url: 'https://graphql.bitquery.io/',
            document: query,
            requestHeaders: {
                'X-API-KEY': 'BQYvhnv04csZHaprIBZNwtpRiDIwEIW9',
            },
        });
        if (tokens.ethereum.address[0].balances) {
            return tokens.ethereum.address[0].balances;
        }
        else {
            throw new Error('Not available tokens');
        }
    }
    catch (error) {
        console.log(error);
    }
});
exports.getTokens = getTokens;
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
const getTokenIconBySymbol = (symbol) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const generalSearchForToken = yield axios_1.default.get(`https://api.coingecko.com/api/v3/search?query=${symbol.toUpperCase()}`);
        const getSpecificToken = generalSearchForToken.data.coins.filter((token) => {
            return token.symbol.toUpperCase() === symbol.toLocaleUpperCase();
        });
        if (getSpecificToken) {
            return getSpecificToken[0].thumb;
        }
        else {
            throw new Error('Token icon not found');
        }
    }
    catch (error) {
        console.log(error);
    }
});
exports.getTokenIconBySymbol = getTokenIconBySymbol;
(0, exports.getTokenIconBySymbol)('eth');
