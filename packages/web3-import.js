"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importAccount = void 0;
const web3Provider_1 = require("../provider/web3Provider");
const crypto_js_1 = __importDefault(require("crypto-js"));
const ethers_1 = require("ethers");
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
    if (web3Provider_1.web3Provider.utils.isHexStrict(mnemonicOrPrivateKey)) {
        return web3Provider_1.web3Provider.eth.accounts.privateKeyToAccount(mnemonicOrPrivateKey);
    }
    else {
        const descryptMnemonic = crypto_js_1.default.AES.decrypt(mnemonicOrPrivateKey, pwdAccount).toString(crypto_js_1.default.enc.Utf8);
        const { privateKey } = ethers_1.ethers.Wallet.fromMnemonic(descryptMnemonic);
        const web3MnemonicAccount = web3Provider_1.web3Provider.eth.accounts.privateKeyToAccount(privateKey);
        return web3MnemonicAccount;
    }
};
exports.importAccount = importAccount;
// importAccount Function using Hd wallet
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
