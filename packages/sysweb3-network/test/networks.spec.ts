import {
  VALID_BIP44_DATA_RESPONSE,
  VALID_BITCOIN_LIKE_NETWORK,
  VALID_UTXO_CONFIG_DATA,
} from '../src/constants';
import { getUtxoNetworkConfig, getPubType } from '../src/networks';

describe('networks tests', () => {
  it('should return utxo network config for a given coin', () => {
    const { chainId } = VALID_BIP44_DATA_RESPONSE;

    const response = getUtxoNetworkConfig(chainId);

    expect(response).toStrictEqual(VALID_UTXO_CONFIG_DATA);
  });

  it('should return pub types for a given coin', () => {
    const response = getPubType(VALID_BITCOIN_LIKE_NETWORK.networks.mainnet);

    expect(response).toStrictEqual(VALID_BITCOIN_LIKE_NETWORK.types);
  });
});
