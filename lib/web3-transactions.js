"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sendTransactions = void 0;

require("core-js/modules/es.promise.js");

require("core-js/modules/es.regexp.to-string.js");

var _web3Provider = require("../provider/web3Provider");

/**
 * This function should send a value to address provided.
 * 
 * @param fromPrivateKey
 * @param toAddress
 * @param value
 * 
 * Use example: 
 * 
 * ```<button onClick={sendTransaction('0x00000000000000000000089000000000000000', '0x00000000000000000000089000000000000', 0.5)}>Send Value to address provided!</button>```
 * 
 * Example of object return (in console):
 * 
 * ```
 *      {
          blockHash: '0x00000000000000000000089000000000000',
          blockNumber: 10225756,
          contractAddress: null,
          cumulativeGasUsed: 13888023,
          effectiveGasPrice: 1063189439,
          from: '0x000000000000000000000000000000000',
          gasUsed: 21000,
          logs: [],
          logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
          status: true,
          to: '0x000000000000000000000000000000000',
          transactionHash: '0x0000000000000000000000000000000000000',
          transactionIndex: 61,
          type: '0x0'
        }
```
 *
 */
const sendTransactions = async (fromPrivateKey, toAddress, value) => {
  const signedTransaction = await _web3Provider.web3Provider.eth.accounts.signTransaction({
    to: toAddress,
    value: _web3Provider.web3Provider.utils.toWei(value.toString(), 'ether'),
    gas: await _web3Provider.web3Provider.eth.estimateGas({
      to: toAddress
    })
  }, fromPrivateKey);

  try {
    return _web3Provider.web3Provider.eth.sendSignedTransaction("".concat(signedTransaction.rawTransaction)).then(result => result);
  } catch (error) {
    console.log("".concat(error));
  }
};

exports.sendTransactions = sendTransactions;