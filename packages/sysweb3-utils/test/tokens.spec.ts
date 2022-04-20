import {
  getFiatValueByToken,
  getNftImage,
  getTokenIconBySymbol,
} from '../src/tokens';
import { setActiveNetwork } from '@pollum-io/sysweb3-network';

describe('web3-NFT tests', () => {
  it('should check NFT url', async () => {
    setActiveNetwork('ethereum', 1);
    const nftUrl = await getNftImage(
      '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
      8520
    );

    expect(nftUrl.startsWith('https://ipfs.io/ipfs/')).toBe(true);
  });

  it('should get token icon by symbol', async () => {
    const token = await getTokenIconBySymbol('eth');
    expect(token.largeImage.startsWith('https://')).toBe(true);
  });

  it('should retrive a token price as fiat', async () => {
    const result = await getFiatValueByToken('syscoin', 'usd');
    console.log(result);

    expect(typeof result.price).toBe('number');
    expect(result.price).toBeGreaterThan(0);

    expect(typeof result.priceChange).toBe('number');
    expect(result.priceChange).toBeGreaterThanOrEqual(0);
  });
});
