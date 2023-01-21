import { contractChecker, isContractAddress } from '../src/contracts';
import { getContractType } from '../src/getContract';

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

describe('Validate Contract Type in Mumbai Network using contractType function', () => {
  it('Should return Undefined Contract', async () => {
    const handleContractType = await getContractType(
      '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
      ethProvidersUrl[80001]
    );

    expect(typeof handleContractType).toBe('object');
    expect(typeof handleContractType?.type).toBe('string');
    expect(typeof handleContractType?.message).toBe('string');
    expect(handleContractType?.type).toBe('Undefined');
  });

  it('Should return ERC 20 Contract', async () => {
    const handleContractType = await getContractType(
      '0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa',
      ethProvidersUrl[80001]
    );

    expect(typeof handleContractType).toBe('object');
    expect(typeof handleContractType?.type).toBe('string');
    expect(typeof handleContractType?.message).toBe('string');
    expect(handleContractType?.type).toBe('Undefined');
  });

  it('Should return ERC 721 Contract', async () => {
    const handleContractType = await getContractType(
      '0x0c702F78b889f25E3347fb978345F7eCF4F3861C',
      ethProvidersUrl[80001]
    );

    expect(typeof handleContractType).toBe('object');
    expect(typeof handleContractType?.type).toBe('string');
    expect(handleContractType?.type).toBe('ERC-721');
  });

  it('Should return WETH ERC 1155 Contract', async () => {
    const handleContractType = await getContractType(
      'Aa54A8E8BdEA1aa7E2ed7E5F681c798a8eD7e5AB',
      ethProvidersUrl[80001]
    );

    expect(typeof handleContractType).toBe('object');
    expect(typeof handleContractType?.type).toBe('string');
    expect(typeof handleContractType?.message).toBe('string');
    expect(handleContractType?.type).toBe('ERC-1155');
  });
});

describe('Validate Contracts in Mumbai Network using contractChecker function', () => {
  it('Should return Undefined Contract', async () => {
    const handleContractType = await contractChecker(
      '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45',
      ethProvidersUrl[80001]
    );

    expect(typeof handleContractType).toBe('object');
    expect(typeof handleContractType?.type).toBe('string');
    expect(typeof handleContractType?.message).toBe('string');
    expect(handleContractType?.type).toBe('Undefined');
  });

  it('Should return ERC 20 Contract', async () => {
    const handleContractType = await contractChecker(
      '0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa',
      ethProvidersUrl[80001]
    );

    expect(typeof handleContractType).toBe('object');
    expect(typeof handleContractType?.type).toBe('string');
    expect(typeof handleContractType?.message).toBe('string');
    expect(handleContractType?.type).toBe('Undefined');
  });

  it('Should return ERC 721 Contract', async () => {
    const handleContractType = await contractChecker(
      '0x0c702F78b889f25E3347fb978345F7eCF4F3861C',
      ethProvidersUrl[80001]
    );

    expect(typeof handleContractType).toBe('object');
    expect(typeof handleContractType?.type).toBe('string');
    expect(handleContractType?.type).toBe('ERC-721');
  });

  it('Should return WETH ERC 1155 Contract', async () => {
    const handleContractType = await contractChecker(
      'Aa54A8E8BdEA1aa7E2ed7E5F681c798a8eD7e5AB',
      ethProvidersUrl[80001]
    );

    expect(typeof handleContractType).toBe('object');
    expect(typeof handleContractType?.type).toBe('string');
    expect(typeof handleContractType?.message).toBe('string');
    expect(handleContractType?.type).toBe('ERC-1155');
  });
});
