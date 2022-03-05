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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTransactions = void 0;
const web3Provider_1 = require("../provider/web3Provider");
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
const sendTransactions = (fromPrivateKey, toAddress, value) => __awaiter(void 0, void 0, void 0, function* () {
    const signedTransaction = yield web3Provider_1.web3Provider.eth.accounts.signTransaction({
        to: toAddress,
        value: web3Provider_1.web3Provider.utils.toWei(value.toString(), 'ether'),
        gas: yield web3Provider_1.web3Provider.eth.estimateGas({
            to: toAddress,
        }),
    }, fromPrivateKey);
    try {
        return web3Provider_1.web3Provider.eth
            .sendSignedTransaction(`${signedTransaction.rawTransaction}`)
            .then((result) => result);
    }
    catch (error) {
        console.log(`${error}`);
    }
});
exports.sendTransactions = sendTransactions;
