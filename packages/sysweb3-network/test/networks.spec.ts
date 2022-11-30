import { getEthRpc, validateEthRpc } from '../src/index';
import {
  EXAMPLE_L1_URL,
  EXAMPLE_L2_URL,
  SYS_L2_URL,
  TESTNET_URL,
} from './constants';

describe('Networks', () => {
  it('should validate a L1 network', async () => {
    const result = await validateEthRpc(EXAMPLE_L1_URL.url);
    expect(result.hexChainId).toBe('0x' + EXAMPLE_L1_URL.chainId.toString(16));
  });
  it('should validate a L2 network', async () => {
    const result = await validateEthRpc(EXAMPLE_L2_URL.url);
    expect(result.hexChainId).toBe('0x' + EXAMPLE_L2_URL.chainId.toString(16));
  });

  it('should validate a L2 network Syscoin', async () => {
    const result = await validateEthRpc(SYS_L2_URL.url);
    expect(result.hexChainId).toBe('0x' + SYS_L2_URL.chainId.toString(16));
  });
  it('should validate a Testnet network', async () => {
    const result = await validateEthRpc(TESTNET_URL.url);
    expect(result.hexChainId).toBe('0x' + TESTNET_URL.chainId.toString(16));
  });
  it('should getNetwok Response L2', async () => {
    const { formattedNetwork } = await getEthRpc(EXAMPLE_L2_URL);
    expect(formattedNetwork.chainId).toBe(EXAMPLE_L2_URL.chainId);
  });
  it('should getNetwok Response L2 Syscoin', async () => {
    const { formattedNetwork } = await getEthRpc(SYS_L2_URL);
    expect(formattedNetwork.chainId).toBe(SYS_L2_URL.chainId);
  });
});
