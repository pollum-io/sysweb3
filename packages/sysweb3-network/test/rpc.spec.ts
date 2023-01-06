import {
  BLOCKBOOK_RPC_URL,
  CHAIN_ID_HEX,
  CHAIN_ID_NUMBER,
  VALID_BIP44_DATA_RESPONSE,
  VALID_BLOCKBOOK_RPC_RESPONSE,
} from '../src/constants';
import {
  getBip44Chain,
  isValidChainIdForEthNetworks,
  validateChainId,
  validateSysRpc,
} from '../src/rpc';

describe('rpc tests', () => {
  it('should check if given chain id is a safe integer and it is between 0 and 4503599627370476', () => {
    const isValid = isValidChainIdForEthNetworks(CHAIN_ID_NUMBER);

    expect(isValid).toBe(true);
  });

  it('should validate an ethereum chain id', () => {
    const isValid = validateChainId(CHAIN_ID_NUMBER);

    expect(isValid.valid).toBe(true);
    expect(isValid.hexChainId).toBe(CHAIN_ID_HEX);
  });

  it('should validate given trezor blockbook rpc', async () => {
    const response = await validateSysRpc(BLOCKBOOK_RPC_URL);

    expect(response).toStrictEqual(VALID_BLOCKBOOK_RPC_RESPONSE);
  });

  it('should get bip44 data for given coin', () => {
    const isTestnet = VALID_BLOCKBOOK_RPC_RESPONSE.chain === 'test';

    const response = getBip44Chain(
      VALID_BLOCKBOOK_RPC_RESPONSE.coin,
      isTestnet
    );

    expect(response).toStrictEqual(VALID_BIP44_DATA_RESPONSE);
  });
});
