import Web3 from 'web3';

const web3Provider = (url?: string) => {
  let currentUrl = url;

  let defaultUrl =
    'https://mainnet.infura.io/v3/c42232a29f9d4bd89d53313eb16ec241';

  console.log(currentUrl);

  return new Web3(
    new Web3.providers.HttpProvider(currentUrl ? currentUrl : defaultUrl)
  );
};

export default web3Provider;
