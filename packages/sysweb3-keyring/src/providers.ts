import { BigNumber, ethers, logger } from 'ethers';
import { Logger, shallowCopy } from 'ethers/lib/utils';

import { checkError } from './utils';

export class CustomJsonRpcProvider extends ethers.providers.JsonRpcProvider {
  private delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  private rateLimit = 10;
  private cooldownTime = 85 * 1000;
  private requestCount = 0;
  private lastRequestTime = 0;
  public serverHasAnError = false;

  private canMakeRequest = () => {
    const now = Date.now();
    const elapsedTime = now - this.lastRequestTime;

    if (elapsedTime >= this.cooldownTime) {
      this.requestCount = 0;
    }

    if (this.serverHasAnError) {
      return false;
    }

    if (this.requestCount < this.rateLimit || !this.serverHasAnError) {
      this.requestCount++;
      this.lastRequestTime = now;
      return true;
    }
  };

  private throttledRequest = async <T>(requestFn: () => Promise<T>) => {
    while (!this.canMakeRequest()) {
      await this.delay(2000);
    }
    return requestFn();
  };

  async perform(method: string, params: any): Promise<any> {
    // Legacy networks do not like the type field being passed along (which
    // is fair), so we delete type if it is 0 and a non-EIP-1559 network
    if (method === 'call' || method === 'estimateGas') {
      const tx = params.transaction;
      if (tx && tx.type != null && BigNumber.from(tx.type).isZero()) {
        // If there are no EIP-1559 properties, it might be non-EIP-1559
        if (tx.maxFeePerGas == null && tx.maxPriorityFeePerGas == null) {
          const feeData = await this.getFeeData();
          if (
            feeData.maxFeePerGas == null &&
            feeData.maxPriorityFeePerGas == null
          ) {
            // Network doesn't know about EIP-1559 (and hence type)
            params = shallowCopy(params);
            params.transaction = shallowCopy(tx);
            delete params.transaction.type;
          }
        }
      }
    }

    const args = this.prepareRequest(method, params);

    if (args == null) {
      logger.throwError(
        method + ' not implemented',
        Logger.errors.NOT_IMPLEMENTED,
        { operation: method }
      );
    }
    try {
      return await this.send(args[0], args[1]);
    } catch (error) {
      return checkError(method, error, params);
    }
  }

  async send(method: string, params: any[]) {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      const options: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: 1,
        }),
      };

      const result = await this.throttledRequest(() =>
        fetch(this.connection.url, options)
          .then((response) => response.json())
          .then((json) => {
            if (json.error) {
              this.serverHasAnError = true;
              throw new Error('Rate limit reached: ' + json.error.message);
            }
            this.serverHasAnError = false;
            return json.result;
          })
      );

      return result;
    } catch (error) {
      this.serverHasAnError = true;

      throw {
        error,
        message:
          'The current RPC provider has an error. Pali performance may be affected. Modify the RPC URL in the network settings to resolve this issue.',
      };
    }
  }
}
