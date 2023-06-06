import { ethers } from 'ethers';

export class CustomJsonRpcProvider extends ethers.providers.JsonRpcProvider {
  private _delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  private rateLimit = 10;
  private timeFrame = 60 * 1000;
  private requestCount = 0;
  private lastRequestTime = 0;

  private _canMakeRequest = () => {
    const now = Date.now();
    const elapsedTime = now - this.lastRequestTime;

    if (elapsedTime >= this.timeFrame) {
      this.requestCount = 0;
    }

    if (this.requestCount < this.rateLimit) {
      this.requestCount++;
      this.lastRequestTime = now;
      return true;
    }

    return false;
  };

  private _throttledRequest = async <T>(requestFn: () => Promise<T>) => {
    while (!this._canMakeRequest()) {
      await this._delay(500);
    }
    return requestFn();
  };

  async send(method: string, params: any[]) {
    try {
      const result = await this._throttledRequest(() =>
        super.send(method, params)
      );
      return result;
    } catch (error) {
      if (error.status === 429) {
        throw new Error('Rate limit reached: ' + error.message + error.status);
      }
      throw error;
    }
  }
}
