import Web3 from 'web3';

interface IWeb3Account {
  address: string;
  privateKey: string;
  signTransaction: Function;
  sign: Function;
  encrypt: Function;
}

const sysAccount = () => {
  const urlProvider =
    'https://api-rinkeby.etherscan.io/api?module=account&action=balance&address=0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae&tag=latest&apikey=3QSU7T49W5YYE248ZRF1CPKPRN7FPRPBKH';

  const createAccount = () => {
    const web3: Web3 = new Web3(new Web3.providers.HttpProvider(urlProvider));
    const newAccount: IWeb3Account = web3.eth.accounts.create();

    return {
      address: newAccount?.address,
      privateKey: newAccount?.privateKey,
    };
  };
  return {
    createAccount,
  };
};

const { createAccount } = sysAccount();

console.log(createAccount());

export default sysAccount;
