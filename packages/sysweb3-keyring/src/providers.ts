import { Networkish } from '@ethersproject/networks';
import { deepCopy } from '@ethersproject/properties';
import { fetchJson } from '@ethersproject/web';
import { BigNumber, ethers, logger } from 'ethers';
import { ConnectionInfo, Logger, shallowCopy } from 'ethers/lib/utils';

import { checkError } from './utils';
export class CustomJsonRpcProvider extends ethers.providers.JsonRpcProvider {
  private timeoutCounter = 0;
  private isPossibleGetChainId = true;
  private cooldownTime = 120 * 1000;
  private rateLimit = 30;
  private requestCount = 0;
  private lastRequestTime = 0;
  private currentChainId = '';
  private currentId = 1;
  public isInCooldown = false;
  public errorMessage: any = '';
  public serverHasAnError = false;
  signal: AbortSignal;
  _pendingBatchAggregator: NodeJS.Timer | null;
  _pendingBatch: Array<{
    request: { method: string; params: Array<any>; id: number; jsonrpc: '2.0' };
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }> | null;

  constructor(
    signal: AbortSignal,
    url?: ConnectionInfo | string,
    network?: Networkish
  ) {
    super(url, network);
    this.signal = signal;
  }

  private throttledRequest = <T>(requestFn: () => Promise<T>): Promise<T> => {
    if (!this.canMakeRequest()) {
      return this.cooldown();
    }
    return new Promise<T>((resolve, reject) => {
      setTimeout(() => {
        requestFn()
          .then((result) => resolve(result))
          .catch((error) => {
            if (error.name === 'AbortError') {
              console.log('Aborted request', error);
              return;
            }
            reject(error);
          });
      }, this.timeoutCounter);
    });
  };
  private canMakeRequest = () => {
    const now = Date.now();
    let elapsedTime = 0;
    if (this.lastRequestTime > 0) {
      elapsedTime = now - this.lastRequestTime;
    }
    if (elapsedTime <= this.cooldownTime && this.serverHasAnError) {
      this.isInCooldown = true;
      return false;
    }

    if (elapsedTime >= this.cooldownTime && this.serverHasAnError) {
      this.requestCount = 0;
      this.serverHasAnError = false;
      this.isInCooldown = true;
      return false; //One last blocked request before cooldown ends
    }

    if (this.requestCount < this.rateLimit || !this.serverHasAnError) {
      this.requestCount++;
      if (elapsedTime > 1000) {
        //Uncomment the console.log to see the request per second
        // console.log(
        //   `Request/sec to Provider(${this.connection.url}): ${this.requestCount}`
        // );
        this.requestCount = 1;
        this.lastRequestTime = now;
      } else if (this.lastRequestTime === 0) {
        this.lastRequestTime = now;
      }
      this.isInCooldown = false;
      return true;
    }
  };

  private cooldown = async () => {
    const now = Date.now();
    const elapsedTime = now - this.lastRequestTime;
    console.error(
      'Cant make request, rpc cooldown is active for the next: ',
      (this.cooldownTime - elapsedTime) / 1000,
      ' seconds'
    );
    throw {
      message: `Cant make request, rpc cooldown is active for the next: ${
        (this.cooldownTime - elapsedTime) / 1000
      } seconds`,
    };
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
    if (!this.isPossibleGetChainId && method === 'eth_chainId') {
      return this.currentChainId;
    }
    const canResetValidationValues = !this.serverHasAnError;

    if (canResetValidationValues) {
      this.timeoutCounter = 0;
    }

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
        id: this.currentId,
      }),
    };

    const result = await this.throttledRequest(() =>
      fetch(this.connection.url, options)
        .then(async (response) => {
          let errorMessage;
          if (!response.ok) {
            let errorBody = {
              error: undefined,
              message: undefined,
            };
            try {
              errorBody = await response.json();
            } catch (error) {
              console.warn('No body in request', error);
            }
            this.errorMessage =
              errorBody.error ||
              errorBody.message ||
              'No message from Provider';
          }
          switch (response.status) {
            case 200:
              if (this.timeoutCounter > 3000) this.timeoutCounter -= 100;
              return response.json();
            case 400:
              errorMessage = this.errorMessage;
              console.error({
                errorMessage,
                message:
                  'Bad Request: The current provider(RPC) could not understand the request due to invalid syntax.',
              });
              break;
            case 401:
              errorMessage = this.errorMessage;
              console.error({
                errorMessage,
                message:
                  'Unauthorized: The request requires user authentication.',
              });
              break;
            case 403:
              errorMessage = this.errorMessage;
              console.error({
                errorMessage,
                message:
                  'Forbidden: You do not have the necessary permissions for the resource.',
              });
              break;
            case 404:
              errorMessage = this.errorMessage;
              console.error({
                errorMessage,
                message:
                  'Not Found: The requested RPC method could not be found.',
              });
              break;
            case 405:
              errorMessage = this.errorMessage;
              console.error({
                errorMessage,
                message:
                  'Method Not Allowed: The request method is known by the current provider but is not supported by the target resource.',
              });
              break;
            case 408:
              //TODO: add a counter here if more than 4 request of a network timeout we should apply cooldown and add message for user
              errorMessage = this.errorMessage;
              console.error({
                errorMessage,
                message:
                  'Request Timeout: The current provider(RPC) would like to shut down the unused connection.',
              });
              break;
            case 413:
              //We shouldn't get this error apart for creation of a contract thats too large
              errorMessage = this.errorMessage;
              console.error({
                errorMessage,
                message:
                  'Payload Too Large: The request entity is larger than limits defined by the server.',
              });
              break;
            case 429:
              this.serverHasAnError = true;
              errorMessage = this.errorMessage;
              console.error({
                errorMessage,
                message:
                  'The current RPC provider has a low rate-limit. We are applying a cooldown that will affect Pali performance. Modify the RPC URL in the network settings to resolve this issue.',
              });

              this.timeoutCounter += 1000;

              throw {
                errorMessage: errorMessage,
                message:
                  'The current RPC provider has a low rate-limit. We are applying a cooldown that will affect Pali performance. Modify the RPC URL in the network settings to resolve this issue.',
              };
            case 500:
              errorMessage = this.errorMessage;
              console.error({
                errorMessage,
                message:
                  'Internal Server Error: The current provider(RPC) encountered an unexpected condition that prevented it from fulfilling the request.',
              });
              break;
            case 503:
              this.serverHasAnError = true;
              errorMessage = this.errorMessage;
              console.error({
                errorMessage: errorMessage,
                message:
                  'Service Unavailable: The current provider(RPC) is not ready to handle the request, possibly due to being down for maintenance or overloaded.',
              });

              this.timeoutCounter += 500; //Lower throttle limit as this is an malfunction on the server and not extrapolated rateLimit

              throw {
                errorMessage: errorMessage,
                message:
                  'Service Unavailable: The current provider(RPC) is not ready to handle the request, possibly due to being down for maintenance or overloaded.',
              };
            default:
              throw {
                message: `Unexpected HTTP status code: ${response.status}`,
              };
          }
        })
        .then((json) => {
          //Having json.error its needed because providers sometime won't return a proper HTTP status code (as 400) and will return a 200 with an error
          if (json.error) {
            if (json.error.message.includes('insufficient funds')) {
              console.error({
                errorMessage: json.error.message,
              });
              this.errorMessage = json.error.message;
              throw new Error(json.error.message);
            }
            this.errorMessage = json.error.message;
            console.log({ requestData: { method, params }, error: json.error });
            console.error({
              errorMessage: json.error.message,
            });
            throw new Error(json.error.message);
          }
          if (method === 'eth_chainId') {
            this.currentChainId = json.result;
            this.isPossibleGetChainId = false;
          }
          this.currentId++;
          this.serverHasAnError = false;
          return json.result;
        })
    );
    return result;
  }

  async sendBatch(method: string, params: Array<any>) {
    const request = {
      method: method,
      params: params,
      id: this._nextId++,
      jsonrpc: '2.0',
    };

    if (this._pendingBatch == null) {
      this._pendingBatch = [];
    }

    const inflightRequest: any = { request, resolve: null, reject: null };

    const promise = new Promise((resolve, reject) => {
      inflightRequest.resolve = resolve;
      inflightRequest.reject = reject;
    });

    this._pendingBatch.push(inflightRequest);

    if (!this._pendingBatchAggregator) {
      // Schedule batch for next event loop + short duration
      this._pendingBatchAggregator = setTimeout(() => {
        // Get teh current batch and clear it, so new requests
        // go into the next batch
        const batch = this._pendingBatch;
        this._pendingBatch = null;
        this._pendingBatchAggregator = null;

        // Get the request as an array of requests
        const request = batch?.map((inflight) => inflight.request);

        this.emit('debug', {
          action: 'requestBatch',
          request: deepCopy(request),
          provider: this,
        });

        return fetchJson(this.connection, JSON.stringify(request)).then(
          (result) => {
            this.emit('debug', {
              action: 'response',
              request: request,
              response: result,
              provider: this,
            });

            // For each result, feed it to the correct Promise, depending
            // on whether it was a success or error
            batch?.forEach((inflightRequest, index) => {
              const payload = result[index];
              if (payload.error) {
                const error = new Error(payload.error.message);
                (<any>error).code = payload.error.code;
                (<any>error).data = payload.error.data;
                inflightRequest.reject(error);
              } else {
                inflightRequest.resolve(payload.result);
              }
            });
          },
          (error) => {
            this.emit('debug', {
              action: 'response',
              error: error,
              request: request,
              provider: this,
            });

            batch?.forEach((inflightRequest) => {
              inflightRequest.reject(error);
            });
          }
        );
      }, 50);
    }

    return promise;
  }
}
