import { ethers } from 'ethers';

export class CustomJsonRpcProvider extends ethers.providers.JsonRpcProvider {
  private delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  private rateLimit = 10;
  private cooldownTime = 85 * 1000;
  private requestCount = 0;
  private lastRequestTime = 0;
  private serverHasAnError = false;

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

      throw error;
    }
  }
}
