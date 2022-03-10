import { getTokenIconBySymbol, getTokens } from './web3-tokens';

describe('web3-tokens tests', () => {
  it('should get tokens', async () => {
    const tokens = await getTokens(
      '0xa3d42513a1affe8d0862cf51df6145523837393a'
    );
    if (tokens?.length > 0) {
      const firstTokenValue = tokens[0].value;
      expect(typeof firstTokenValue).toBe('number');
    }
  });

  it('should get token icon by symbol', async () => {
    const token = await getTokenIconBySymbol('eth');
    expect(token.startsWith('https://')).toBe(true);
  });
});
