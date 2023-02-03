import { validateEOAAddress } from '../src';

const ethProvidersUrl = {
  57: 'https://rpc.syscoin.org', // Syscoin Mainnet at Ethereum
  137: 'https://polygon-rpc.com', // Polygon Mainnet
  5700: 'https://rpc.tanenbaum.io', // Syscoin Testnet
  80001: 'https://rpc-mumbai.maticvigil.com', // Polygon Testnet
};

describe('Validate Address', () => {
  it('Should return a valid wallet address', async () => {
    const validateAddress = await validateEOAAddress(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      ethProvidersUrl[80001]
    );

    expect(typeof validateAddress).toBe('object');
    expect(validateAddress.contract).toBe(false);
    expect(validateAddress.wallet).toBe(true);
  });

  it('Should return a valid contract address', async () => {
    const validateAddress = await validateEOAAddress(
      '0xd19018f7946D518D316BB10FdFF118C28835cF7a',
      ethProvidersUrl[80001]
    );

    expect(typeof validateAddress).toBe('object');
    expect(validateAddress.contract).toBe(true);
    expect(validateAddress.wallet).toBe(false);
  });

  it('Should return a invalid (undefined) address for both', async () => {
    const validateAddress = await validateEOAAddress(
      '0xd19018f7946D518D316BB10FdFF118C28835c2345',
      ethProvidersUrl[80001]
    );

    expect(typeof validateAddress).toBe('object');
    expect(validateAddress.contract).toBe(undefined);
    expect(validateAddress.wallet).toBe(undefined);
  });
});
