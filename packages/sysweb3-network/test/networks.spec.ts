import { getFormattedBitcoinLikeNetwork, getPubType } from '../src/networks';
import {
  VALID_BIP44_DATA_RESPONSE,
  VALID_BITCOIN_LIKE_NETWORK,
} from './constants';

describe('networks tests', () => {
  it('should return formatted bitcoin like network for a given coin', () => {
    const {
      nativeCurrency: { name },
      chainId,
    } = VALID_BIP44_DATA_RESPONSE;

    const response = getFormattedBitcoinLikeNetwork(chainId, name);

    expect(response.networks).toStrictEqual(
      VALID_BITCOIN_LIKE_NETWORK.networks
    );
  });

  it('should return pub types for a given coin', () => {
    const response = getPubType(VALID_BITCOIN_LIKE_NETWORK.networks.mainnet);

    expect(response).toStrictEqual(VALID_BITCOIN_LIKE_NETWORK.types);
  });
});
