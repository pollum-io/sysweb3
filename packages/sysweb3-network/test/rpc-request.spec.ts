import { jsonRpcRequest } from '../src/rpc-request';
import { RPC_URL } from './constants';

describe('json rpc request tests', () => {
  it('should return the chain id as hexadecimal for a given rpc', async () => {
    const chainId = await jsonRpcRequest(RPC_URL, 'eth_chainId');

    expect(chainId).toBe('0x1');
  });
});
