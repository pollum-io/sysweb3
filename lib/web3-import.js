"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.importAccount = void 0;

require("core-js/modules/es.regexp.to-string.js");

var _web3Provider = require("../provider/web3Provider");

var _cryptoJs = _interopRequireDefault(require("crypto-js"));

var _ethers = require("ethers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * This function should return an Account Object from imported wallet.
 * 
 * @param mnemonicOrPrivateKey
 * @param pwdAccount
 * 
 * Use example: 
 * 
 * ```
 * <button onClick={importAccount('this test mnemonic phrase for import my account', 'test123')}>Import My account!</button>
 * ```
 * 
 * Example of return object:
 * 
 * ```
 *      {
        address: '0x00000000000000000000000000',
        privateKey: '0x0000000000000000000000000000000000000000000',
        signTransaction: [Function: signTransaction],
        sign: [Function: sign],
        encrypt: [Function: encrypt]
         }
```
 *
 */
const importAccount = (mnemonicOrPrivateKey, pwdAccount) => {
  if (_web3Provider.web3Provider.utils.isHexStrict(mnemonicOrPrivateKey)) {
    return _web3Provider.web3Provider.eth.accounts.privateKeyToAccount(mnemonicOrPrivateKey);
  } else {
    const descryptMnemonic = _cryptoJs.default.AES.decrypt(mnemonicOrPrivateKey, pwdAccount).toString(_cryptoJs.default.enc.Utf8);

    const {
      privateKey
    } = _ethers.ethers.Wallet.fromMnemonic(descryptMnemonic);

    const web3MnemonicAccount = _web3Provider.web3Provider.eth.accounts.privateKeyToAccount(privateKey);

    return web3MnemonicAccount;
  }
}; // importAccount Function using Hd wallet
// export const importAccount = async (mnemonicOrPrivateKey, pwdAccount) => {
//   if (web3Provider.utils.isHexStrict(mnemonicOrPrivateKey)) {
//     return web3Provider.eth.accounts.privateKeyToAccount(mnemonicOrPrivateKey);
//   } else {
//     const decryptMnemonic = CryptoJS.AES.decrypt(
//       mnemonicOrPrivateKey,
//       pwdAccount
//     ).toString(CryptoJS.enc.Utf8);
//     const info = await mnemonicToSeed(decryptMnemonic);
//     const hdwallet = hdkey.fromMasterSeed(info);
//     const wallet_hdpath = "m/44'/60'/0'/0/";
//     const wallet = hdwallet.derivePath(wallet_hdpath + 1).getWallet();
//     const privateKey = '0x' + wallet.getPrivateKey().toString('hex');
//     const web3MnemonicAccount =
//       await web3Provider.eth.accounts.privateKeyToAccount(privateKey);
//     return web3MnemonicAccount;
//   }
// };


exports.importAccount = importAccount;