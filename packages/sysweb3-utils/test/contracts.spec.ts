import { isContractAddress, contractChecker } from '../src/contracts';

const ethProvidersUrl = {
  57: 'https://rpc.syscoin.org', // Syscoin Mainnet at Ethereum
  137: 'https://polygon-rpc.com', // Polygon Mainnet
  5700: 'https://rpc.tanenbaum.io', // Syscoin Testnet
  80001: 'https://rpc-mumbai.maticvigil.com', // Polygon Testnet
};

describe('Validate is Contract Test', () => {
  it('Should return true from  is contract verification', async () => {
    const isContract = await isContractAddress(
      '0x0c702F78b889f25E3347fb978345F7eCF4F3861C', // Correctly address
      ethProvidersUrl[80001]
    );
    expect(typeof isContract).toBe('boolean');
    expect(isContract).toBe(true);
  });

  it('Should return false from  is contract verification', async () => {
    const isContract = await isContractAddress(
      '0x0c702F78b889f25E3347fb978345F7eCF4F38443', // Bad Address
      ethProvidersUrl[80001]
    );
    expect(typeof isContract).toBe('boolean');
    expect(isContract).toBe(false);
  });
});

describe('Validate Contract Type using contractChecker function', () => {
  it('Should return ERC 721 Contract', async () => {
    const handleContractChecker = await contractChecker(
      '0x0c702F78b889f25E3347fb978345F7eCF4F3861C',
      ethProvidersUrl[80001]
    );

    console.log('handleContractChecker ERC721', handleContractChecker);
  });

  it('Should return WETH ERC 20 Contract', async () => {
    const handleContractChecker = await contractChecker(
      '0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa',
      ethProvidersUrl[80001]
    );

    console.log('handleContractChecker ERC20', handleContractChecker);
  });
});
