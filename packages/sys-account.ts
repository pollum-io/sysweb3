import web3Provider from '../provider/web3Provider';
import { IWeb3Account } from '../types/web3AccountType';

export const createAccount = () => {
  const newAccount: IWeb3Account = web3Provider.eth.accounts.create();

  return {
    address: newAccount?.address,
    privateKey: newAccount?.privateKey,
  };
};

console.log(createAccount());
