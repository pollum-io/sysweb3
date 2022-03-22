import Web3 from 'web3';

export const web3Provider = new Web3(
  new Web3.providers.HttpProvider('https://rpc.syscoin.org/')
);
