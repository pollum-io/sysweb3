import { web3Provider } from '../provider/web3Provider';
import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';

export const importAccount = (mnemonicOrPrivateKey, pwdAccount) => {
  if (web3Provider().utils.isHexStrict(mnemonicOrPrivateKey)) {
    return web3Provider().eth.accounts.privateKeyToAccount(
      mnemonicOrPrivateKey
    );
  } else {
    const descryptMnemonic = CryptoJS.AES.decrypt(
      mnemonicOrPrivateKey,
      pwdAccount
    ).toString(CryptoJS.enc.Utf8);

    const mnemonicAccount = ethers.Wallet.fromMnemonic(descryptMnemonic);

    const web3MnemonicAccount = web3Provider().eth.accounts.privateKeyToAccount(
      mnemonicAccount.privateKey
    );

    return web3MnemonicAccount;
  }
};
