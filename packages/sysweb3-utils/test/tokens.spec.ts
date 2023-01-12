import { getFiatValueByToken, getTokenIconBySymbol } from '../src/tokens';

describe('web3-Tokens tests', () => {
  it('should get token icon by symbol', async () => {
    const token = await getTokenIconBySymbol('eth');
    expect(token.startsWith('https://')).toBe(true);
  });

  it('should retrieve a token price as fiat', async () => {
    const result = await getFiatValueByToken('syscoin', 'usd');

    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });
});
