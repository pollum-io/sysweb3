// import { changeNetwork } from '../provider/web3Provider';
import {
  getFiatValueByToken,
  getNftImage,
  getTokenIconBySymbol,
} from '../src/tokens';

describe('web3-NFT tests', () => {
  it('should check NFT url', async () => {
    // changeNetwork(1);
    const NFTUrl = await getNftImage(
      '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
      8520
    );

    expect(NFTUrl.startsWith('https://ipfs.io/ipfs/')).toBe(true);
  });

  it('should get token icon by symbol', async () => {
    const token = await getTokenIconBySymbol('eth');
    expect(token.startsWith('https://')).toBe(true);
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
