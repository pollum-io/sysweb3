import { web3Provider } from '../provider/web3Provider';

import CryptoJS from 'crypto-js';
import { mnemonicToSeed } from 'bip39';
import { hdkey } from 'ethereumjs-wallet';

export const importAccount = async (mnemonicOrPrivateKey, pwdAccount) => {
  if (web3Provider().utils.isHexStrict(mnemonicOrPrivateKey)) {
    return web3Provider().eth.accounts.privateKeyToAccount(
      mnemonicOrPrivateKey
    );
  } else {
    const decryptMnemonic = CryptoJS.AES.decrypt(
      mnemonicOrPrivateKey,
      pwdAccount
    ).toString(CryptoJS.enc.Utf8);

    const info = await mnemonicToSeed(decryptMnemonic);
    const hdwallet = hdkey.fromMasterSeed(info);
    const wallet_hdpath = "m/44'/60'/0'/0/";
    const wallet = hdwallet.derivePath(wallet_hdpath + 1).getWallet();
    const privateKey = '0x' + wallet.getPrivateKey().toString('hex');

    const web3MnemonicAccount =
      await web3Provider().eth.accounts.privateKeyToAccount(privateKey);

    return web3MnemonicAccount;
  }
};
