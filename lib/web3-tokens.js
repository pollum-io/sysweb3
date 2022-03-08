"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getTokens = exports.getTokenIconBySymbol = void 0;

require("core-js/modules/es.promise.js");

var _graphqlRequest = require("graphql-request");

var _axios = _interopRequireDefault(require("axios"));

var _templateObject;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

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
const getTokens = async walletAddress => {
  try {
    const query = (0, _graphqlRequest.gql)(_templateObject || (_templateObject = _taggedTemplateLiteral(["\n      {\n        ethereum {\n          address(\n            address: { is: \"", "\" }\n          ) {\n            balances {\n              currency {\n                symbol\n              }\n              value\n            }\n          }\n        }\n      }\n    "])), walletAddress);
    const tokens = await (0, _graphqlRequest.request)({
      url: 'https://graphql.bitquery.io/',
      document: query,
      requestHeaders: {
        'X-API-KEY': 'BQYvhnv04csZHaprIBZNwtpRiDIwEIW9'
      }
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


exports.getTokens = getTokens;

const getTokenIconBySymbol = async symbol => {
  try {
    const generalSearchForToken = await _axios.default.get("https://api.coingecko.com/api/v3/search?query=".concat(symbol.toUpperCase()));
    const getSpecificToken = generalSearchForToken.data.coins.filter(token => {
      return token.symbol.toUpperCase() === symbol.toLocaleUpperCase();
    });

    if (getSpecificToken) {
      return getSpecificToken[0].thumb;
    } else {
      throw new Error('Token icon not found');
    }
  } catch (error) {
    console.log(error);
  }
};

exports.getTokenIconBySymbol = getTokenIconBySymbol;
getTokenIconBySymbol('eth');