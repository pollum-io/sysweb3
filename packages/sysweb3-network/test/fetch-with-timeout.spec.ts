import { RPC_URL } from '../src/constants';
import { getFetchWithTimeout } from '../src/fetch-with-timeout';

global.fetch = jest.fn().mockImplementation(() => {
  return new Promise((resolve) =>
    resolve({
      json: () => ({ data: 'hello' }),
    })
  );
});

describe('json rpc request tests', () => {
  it('should complete a request', async () => {
    const fetchWithTimeout = getFetchWithTimeout(1000 * 30);

    const headers: { 'Content-Type': string; Authorization?: string } = {
      'Content-Type': 'application/json',
    };

    const jsonRpcResponse = await fetchWithTimeout(RPC_URL, {
      method: 'POST',
      body: JSON.stringify({
        id: Date.now().toString(),
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
      }),
      headers,
      cache: 'default',
    })
      .then((httpResponse: any) => httpResponse.json())
      .catch((error) => {
        throw new Error(error);
      });

    expect(jsonRpcResponse).toStrictEqual({ data: 'hello' });
  });
});
