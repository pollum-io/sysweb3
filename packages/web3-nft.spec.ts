import { getUserNFT, getNFTImage } from './web3-nft';
import { FAKE_ADDRESS } from '../test-constants/test-constants';

describe('web3-NFT tests', () => {
  it('should get user NFTs', async () => {
    const userNFT = await getUserNFT(
      '0xa3d42513a1affe8d0862cf51df6145523837393a'
    );
    if (userNFT != null) {
      const blocknumber = userNFT[0].blockNumber;
      expect(blocknumber.length > 0).toBe(true);
    }
  });
});
