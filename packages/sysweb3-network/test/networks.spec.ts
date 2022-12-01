import { getEthRpc, validateEthRpc } from '../src/index';
import { EXAMPLE_L1, EXAMPLE_L2, SYS_L2, TESTNET } from './constants';

describe('Networks', () => {
  it('should validate a L1 network', async () => {
    const result = await validateEthRpc(EXAMPLE_L1.url);
    expect(result.hexChainId).toBe('0x' + EXAMPLE_L1.chainId.toString(16));
  });
  it('should validate a L2 network', async () => {
    const result = await validateEthRpc(EXAMPLE_L2.url);
    expect(result.hexChainId).toBe('0x' + EXAMPLE_L2.chainId.toString(16));
  });

  it('should validate a L2 network Syscoin', async () => {
    const result = await validateEthRpc(SYS_L2.url);
    expect(result.hexChainId).toBe('0x' + SYS_L2.chainId.toString(16));
  });
  it('should validate a Testnet network', async () => {
    const result = await validateEthRpc(TESTNET.url);
    expect(result.hexChainId).toBe('0x' + TESTNET.chainId.toString(16));
  });
  it('should getNetwok Response L2', async () => {
    const { formattedNetwork } = await getEthRpc(EXAMPLE_L2);
    expect(formattedNetwork.chainId).toBe(EXAMPLE_L2.chainId);
  });
  it('should getNetwok Response L2 Syscoin', async () => {
    const { formattedNetwork } = await getEthRpc(SYS_L2);
    expect(formattedNetwork.chainId).toBe(SYS_L2.chainId);
  });
});
