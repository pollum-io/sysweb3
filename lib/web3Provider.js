"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.web3Provider = exports.changeNetwork = void 0;

require("core-js/modules/es.promise.js");

var _web = _interopRequireDefault(require("web3"));

var _networks = require("../networks/networks");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//@ts-nocheck

/**
 * This function should change the current network.
 * 
 * @param chainId
 * 
 * Here is the available networks to change:
 * 
  - Syscoin Mainnet (57) and Testnet (5700)
  - Ethereum Mainnet (1)
  - Ethereum Rinkeby (4)
  - Polygon Mainnet (137) and Testnet (80001)
 * 
 * Use example: 
 * 
 * ```
 * <button onClick={changeNetwork(4)}>Change the current network</button>
 * ```
 * 
 * @returns void.
 */
const changeNetwork = async chainId => {
  let provider;

  for (let i = 0; i < _networks.networks.length; i++) {
    if (_networks.networks[i].chainId === chainId) {
      provider = _networks.networks[i].url;
      break;
    }
  }

  if (provider === undefined) throw new Error('Network not found, try again with a correct one!');
  const {
    HttpProvider
  } = _web.default.providers;
  web3Provider.setProvider(new HttpProvider(provider));
};

exports.changeNetwork = changeNetwork;
const web3Provider = new _web.default(new _web.default.providers.HttpProvider('https://rpc.syscoin.org/'));
exports.web3Provider = web3Provider;