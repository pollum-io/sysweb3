import Web3 from 'web3';

const urlProvider =
  'https://api-rinkeby.etherscan.io/api?module=account&action=balance&address=0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae&tag=latest&apikey=3QSU7T49W5YYE248ZRF1CPKPRN7FPRPBKH';

const web3Provider = new Web3(new Web3.providers.HttpProvider(urlProvider));

export default web3Provider;
