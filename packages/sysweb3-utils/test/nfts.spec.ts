import { ethers } from 'ethers';

import { getERC721StandardBalance } from '../src/tokens';

const ethProvidersUrl = {
  57: 'https://rpc.syscoin.org', // Syscoin Mainnet at Ethereum
  137: 'https://polygon-rpc.com', // Polygon Mainnet
  5700: 'https://rpc.tanenbaum.io', // Syscoin Testnet
  80001: 'https://rpc-mumbai.maticvigil.com', // Polygon Testnet
};

const RpcProvider = new ethers.providers.JsonRpcProvider(
  ethProvidersUrl[80001] // Mumbai Provider, but we can use any of the providers above
);

describe('ERC-721 NFts tests', () => {
  it('should return balance 0 from NFT contract', async () => {
    const erc721Balance = await getERC721StandardBalance(
      '0x0c702F78b889f25E3347fb978345F7eCF4F3861C', // Contract Address in Mumbai
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5', // Wallet Adress
      RpcProvider
    );

    const convertBalance = Number(erc721Balance);

    expect(typeof erc721Balance).toBe('object'); // Object of BigNumber
    expect(typeof convertBalance).toBe('number');
    expect(convertBalance).toBeLessThanOrEqual(0);
  });

  it('should return balance greater or equal to 1 from NFT contract', async () => {
    const erc721Balance = await getERC721StandardBalance(
      '0xd19018f7946D518D316BB10FdFF118C28835cF7a', // Contract Address in Mumbai
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5', // Wallet Adress
      RpcProvider
    );

    const convertBalance = Number(erc721Balance);

    expect(typeof erc721Balance).toBe('object'); // Object of BigNumber
    expect(typeof convertBalance).toBe('number');
    expect(convertBalance).toBeGreaterThanOrEqual(1);
  });
});
