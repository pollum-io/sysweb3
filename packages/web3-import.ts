import { web3Provider } from '../provider/web3Provider';
import { ethers } from 'ethers';


export const importAccount = (mnemonic: string) => {
  const mnemonicAccount = ethers.Wallet.fromMnemonic(mnemonic);
  
  const web3MnemonicAccount = web3Provider().eth.accounts.privateKeyToAccount(sysMnemonicAccount.privateKey);

  return web3MnemonicAccount;
};
