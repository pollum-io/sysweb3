/* import { validateEOAAddress } from '../src';

const ethProvidersUrl = {
  5: 'https://rpc.ankr.com/eth_goerli', // Goerli Testnet
  57: 'https://rpc.syscoin.org', // Syscoin Mainnet at Ethereum
  137: 'https://polygon-rpc.com', // Polygon Mainnet
  5700: 'https://rpc.tanenbaum.io', // Syscoin Testnet
  80001: 'https://rpc-mumbai.maticvigil.com', // Polygon Testnet
};

//Mumbai Tests
describe('Validate Addresses at Mumbai', () => {
  // Contracts
  it('Should return a valid contract address at Mumbai', async () => {
    // Test 1
    const validateContractAddress = await validateEOAAddress(
      '0xd19018f7946D518D316BB10FdFF118C28835cF7a',
      ethProvidersUrl[80001]
    );

    expect(typeof validateContractAddress).toBe('object');
    expect(validateContractAddress.contract).toBe(true);
    expect(validateContractAddress.wallet).toBe(false);

    // Test 2
    const validateContractAddress2 = await validateEOAAddress(
      'Aa54A8E8BdEA1aa7E2ed7E5F681c798a8eD7e5AB',
      ethProvidersUrl[80001]
    );

    expect(typeof validateContractAddress2).toBe('object');
    expect(validateContractAddress2.contract).toBe(true);
    expect(validateContractAddress2.wallet).toBe(false);

    // Test 3
    const validateContractAddress3 = await validateEOAAddress(
      '0x0c702F78b889f25E3347fb978345F7eCF4F3861C',
      ethProvidersUrl[80001]
    );

    expect(typeof validateContractAddress3).toBe('object');
    expect(validateContractAddress3.contract).toBe(true);
    expect(validateContractAddress3.wallet).toBe(false);
  });

  //Wallets
  it('Should return a valid wallet address at Mumbai', async () => {
    // Test 1
    const validateWalletAddress = await validateEOAAddress(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      ethProvidersUrl[80001]
    );

    expect(typeof validateWalletAddress).toBe('object');
    expect(validateWalletAddress.contract).toBe(false);
    expect(validateWalletAddress.wallet).toBe(true);

    // Test 2
    const validateWalletAddress2 = await validateEOAAddress(
      '0x7BFCe3CFE987Ca195404A57cdaF2210c2d131998',
      ethProvidersUrl[80001]
    );

    expect(typeof validateWalletAddress2).toBe('object');
    expect(validateWalletAddress2.contract).toBe(false);
    expect(validateWalletAddress2.wallet).toBe(true);

    // Test 3
    const validateWalletAddress3 = await validateEOAAddress(
      '0xd5e66A5D61690Dd4d6675D1E9eB480ddd640Fe06',
      ethProvidersUrl[80001]
    );

    expect(typeof validateWalletAddress3).toBe('object');
    expect(validateWalletAddress3.contract).toBe(false);
    expect(validateWalletAddress3.wallet).toBe(true);
  });

  //Undefineds
  it('Should return a invalid (undefined) address for both at Mumbai', async () => {
    // Test 1
    const validateInvalidAddress = await validateEOAAddress(
      '0xd19018f7946D518D316BB10FdFF118C28835c2345',
      ethProvidersUrl[80001]
    );

    expect(typeof validateInvalidAddress).toBe('object');
    expect(validateInvalidAddress.contract).toBe(undefined);
    expect(validateInvalidAddress.wallet).toBe(undefined);

    // Test 2
    const validateInvalidAddress2 = await validateEOAAddress(
      '0xd5e66A5D61690Dd4d6675D1E9eB480ddd640Fg84',
      ethProvidersUrl[80001]
    );

    expect(typeof validateInvalidAddress2).toBe('object');
    expect(validateInvalidAddress2.contract).toBe(undefined);
    expect(validateInvalidAddress2.wallet).toBe(undefined);
  });
});

// Goerli Tests
describe('Validate Addresses at Goerli', () => {
  // Contracts
  it('Should return a valid contract address at Goerli', async () => {
    // Test 1
    const validateContractAddress = await validateEOAAddress(
      '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
      ethProvidersUrl[5]
    );

    expect(typeof validateContractAddress).toBe('object');
    expect(validateContractAddress.contract).toBe(true);
    expect(validateContractAddress.wallet).toBe(false);

    // Test 2
    const validateContractAddress2 = await validateEOAAddress(
      '0x1297228A708602B796fa16E9A7683db9Cde09436',
      ethProvidersUrl[5]
    );

    expect(typeof validateContractAddress2).toBe('object');
    expect(validateContractAddress2.contract).toBe(true);
    expect(validateContractAddress2.wallet).toBe(false);

    // Test 3
    const validateContractAddress3 = await validateEOAAddress(
      '0x628a9dB47D7aEB6CF80ebF8C441BB72A83Ddb08e',
      ethProvidersUrl[5]
    );

    expect(typeof validateContractAddress3).toBe('object');
    expect(validateContractAddress3.contract).toBe(true);
    expect(validateContractAddress3.wallet).toBe(false);
  });

  //Wallets
  it('Should return a valid wallet address at Goerli', async () => {
    // Test 1
    const validateWalletAddress = await validateEOAAddress(
      '0x6a702c81d969627021c118b72f67d8bd70534c77',
      ethProvidersUrl[5]
    );

    expect(typeof validateWalletAddress).toBe('object');
    expect(validateWalletAddress.contract).toBe(false);
    expect(validateWalletAddress.wallet).toBe(true);

    // Test 2
    const validateWalletAddress2 = await validateEOAAddress(
      '0xd5e66a5d61690dd4d6675d1e9eb480ddd640fe06',
      ethProvidersUrl[5]
    );

    expect(typeof validateWalletAddress2).toBe('object');
    expect(validateWalletAddress2.contract).toBe(false);
    expect(validateWalletAddress2.wallet).toBe(true);

    // Test 3
    const validateWalletAddress3 = await validateEOAAddress(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      ethProvidersUrl[5]
    );

    expect(typeof validateWalletAddress3).toBe('object');
    expect(validateWalletAddress3.contract).toBe(false);
    expect(validateWalletAddress3.wallet).toBe(true);
  });

  //Undefineds
  it('Should return a invalid (undefined) address for both at Goerli', async () => {
    // Test 1
    const validateInvalidAddress = await validateEOAAddress(
      '0xd19018f7946D518D316BB10FdFF118C28835c2345',
      ethProvidersUrl[5]
    );

    expect(typeof validateInvalidAddress).toBe('object');
    expect(validateInvalidAddress.contract).toBe(undefined);
    expect(validateInvalidAddress.wallet).toBe(undefined);

    // Test 2
    const validateInvalidAddress2 = await validateEOAAddress(
      '0xd5e66A5D61690Dd4d6675D1E9eB480ddd640Fg84',
      ethProvidersUrl[5]
    );

    expect(typeof validateInvalidAddress2).toBe('object');
    expect(validateInvalidAddress2.contract).toBe(undefined);
    expect(validateInvalidAddress2.wallet).toBe(undefined);
  });
});
*/
