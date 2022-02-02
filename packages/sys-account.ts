import web3Provider from '../src/web3Provider';

interface IWeb3Account {
  address: string;
  privateKey: string;
  signTransaction: Function;
  sign: Function;
  encrypt: Function;
}

export const createAccount = () => {
  const newAccount: IWeb3Account = web3Provider.eth.accounts.create();

  return {
    address: newAccount?.address,
    privateKey: newAccount?.privateKey,
  };
};

console.log(createAccount());
