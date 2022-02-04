import Web3 from 'web3';

const urlProvider =
  'https://mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241';

const web3Provider = new Web3(new Web3.providers.HttpProvider(urlProvider));

export default web3Provider;
