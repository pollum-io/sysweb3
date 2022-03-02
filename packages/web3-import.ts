import { web3Provider } from '../provider/web3Provider';
import CryptoJS from 'crypto-js';
import { mnemonicToSeed } from 'bip39';
import { hdkey } from 'ethereumjs-wallet';
import { ethers } from 'ethers';

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

export const importAccount = (mnemonicOrPrivateKey, pwdAccount) => {
  if (web3Provider.utils.isHexStrict(mnemonicOrPrivateKey)) {
    return web3Provider.eth.accounts.privateKeyToAccount(mnemonicOrPrivateKey);
  } else {
    const descryptMnemonic = CryptoJS.AES.decrypt(
      mnemonicOrPrivateKey,
      pwdAccount
    ).toString(CryptoJS.enc.Utf8);

    const { privateKey } = ethers.Wallet.fromMnemonic(descryptMnemonic);

    const web3MnemonicAccount =
      web3Provider.eth.accounts.privateKeyToAccount(privateKey);

    return web3MnemonicAccount;
  }
};


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
