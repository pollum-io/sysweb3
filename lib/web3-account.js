"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createAccount = void 0;

var _web3Provider = require("../provider/web3Provider");

/**
 * This function should return an Account Object.
 * 
 * Use example: 
 * 
 * ```
 * <button onClick={createAccount()}>Create your Account!</button>
 * ```
 * 
 * Example of @returns object:
 * 
 * ```
 *      {
        address: '0x00000000000000000000000',
        privateKey: '0x0000000000000000000000000000000000000000000',
        signTransaction: [Function: signTransaction],
        sign: [Function: sign],
        encrypt: [Function: encrypt]
         }
```
 *
 */
const createAccount = () => _web3Provider.web3Provider.eth.accounts.create();

exports.createAccount = createAccount;