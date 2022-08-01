import { getFetchWithTimeout } from './fetch-with-timeout';

const fetchWithTimeout = getFetchWithTimeout(1000 * 30);

export const jsonRpcRequest = async (
  rpcUrl: string,
  rpcMethod: string,
  rpcParams: any[] = []
) => {
  let fetchUrl = rpcUrl;

  const headers: { 'Content-Type': string; Authorization?: string } = {
    'Content-Type': 'application/json',
  };

  // Convert basic auth URL component to Authorization header
  const { origin, pathname, username, password, search } = new URL(rpcUrl);

  // URLs containing username and password needs special processing
  if (username && password) {
    const encodedAuth = Buffer.from(`${username}:${password}`).toString(
      'base64'
    );

    headers.Authorization = `Basic ${encodedAuth}`;
    fetchUrl = `${origin}${pathname}${search}`;
  }

  const jsonRpcResponse = await fetchWithTimeout(fetchUrl, {
    method: 'POST',
    body: JSON.stringify({
      id: Date.now().toString(),
      jsonrpc: '2.0',
      method: rpcMethod,
      params: rpcParams,
    }),
    headers,
    cache: 'default',
  })
    .then((httpResponse: any) =>
      // eslint-disable-next-line prettier/prettier
      (httpResponse.status === 200 ? httpResponse.json() : httpResponse)
    )
    .catch((error) => {
      throw new Error(error);
    });

  if (
    !jsonRpcResponse ||
    Array.isArray(jsonRpcResponse) ||
    typeof jsonRpcResponse !== 'object'
  ) {
    throw new Error(`RPC endpoint ${rpcUrl} returned non-object response.`);
  }

  const { error, result } = jsonRpcResponse;

  const requestFailed =
    jsonRpcResponse.status && jsonRpcResponse.status !== 200;

  if (error || requestFailed) {
    throw new Error(
      requestFailed
        ? `Bad request. Request returned status ${jsonRpcResponse.status}.`
        : error.message || error
    );
  }

  return result;
};
