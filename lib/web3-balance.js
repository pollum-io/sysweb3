"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getBalance = void 0;

require("core-js/modules/es.promise.js");

require("core-js/modules/es.parse-float.js");

var _web3Provider = require("../provider/web3Provider");

var _lodash = _interopRequireDefault(require("lodash"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * This function should return the balance of current account.
 * 
 * @param walletAddress
 * 
 * Use example: 
 * 
 * ```
 * <button onClick={getBalance('0x000000000000000000000')}>Get balance!</button>
 * ```
 * 
 * Return example:
 * 
 * ```
 *     0.24501
 *```
 *
 */
const getBalance = async walletAddress => {
  try {
    const balance = await _web3Provider.web3Provider.eth.getBalance(walletAddress);

    const formattedBalance = _web3Provider.web3Provider.utils.fromWei(balance);

    const roundedBalance = _lodash.default.floor(parseFloat(formattedBalance), 4);

    return roundedBalance;
  } catch (error) {
    console.log("".concat(error));
    return 0;
  }
};

exports.getBalance = getBalance;