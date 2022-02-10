import { web3Provider } from '../provider/web3Provider';
import { ethers } from 'ethers';

export const importAccount = (mnemonicOrPrivateKey: string) => {
  if (web3Provider().utils.isHexStrict(mnemonicOrPrivateKey)) {
    return web3Provider().eth.accounts.privateKeyToAccount(
      mnemonicOrPrivateKey
    );
  } else {
    const mnemonicAccount = ethers.Wallet.fromMnemonic(mnemonicOrPrivateKey);

    const web3MnemonicAccount = web3Provider().eth.accounts.privateKeyToAccount(
      mnemonicAccount.privateKey
    );

    return web3MnemonicAccount;
  }
};
