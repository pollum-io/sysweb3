import { web3Provider } from '../provider/web3Provider';
import { ethers } from 'ethers';


export const sysImportAccount = (mnemonic: string) => {
  const sysMnemonicAccount = ethers.Wallet.fromMnemonic(mnemonic);
  
  const sysToWeb3 = web3Provider().eth.accounts.privateKeyToAccount(sysMnemonicAccount.privateKey);

  return sysToWeb3;
};
