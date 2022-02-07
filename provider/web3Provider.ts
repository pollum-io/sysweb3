import Web3 from 'web3';

const web3Provider = (url?: string) => {
  if (url) {
    return new Web3(new Web3.providers.HttpProvider(url));
  }
  return new Web3(
    new Web3.providers.HttpProvider(
      'https://mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241'
    )
  );
};
export default web3Provider;
