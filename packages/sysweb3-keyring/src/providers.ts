import { BigNumber, ethers, logger } from 'ethers';
import { Logger, shallowCopy } from 'ethers/lib/utils';

import { checkError } from './utils';

export class CustomJsonRpcProvider extends ethers.providers.JsonRpcProvider {
  private timeoutCounter = 0;
  private isPossibleGetChainId = true;
  private currentChainId = '';
  private currentId = 1;
  private rpcUrlWithError = '';
  public errorMessage: any = '';
  public serverHasAnError = false;

  private throttledRequest = <T>(requestFn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      setTimeout(() => {
        requestFn()
          .then((result) => resolve(result))
          .catch((error) => reject(error));
      }, this.timeoutCounter);
    });
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

    const canResetValidationValues =
      !this.serverHasAnError && this.connection.url !== this.rpcUrlWithError;

    if (canResetValidationValues) {
      this.rpcUrlWithError = '';
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
            const errorBody = await response.json();
            this.errorMessage = errorBody.error || errorBody.message || '';
          }
          switch (response.status) {
            case 200:
              if (this.rpcUrlWithError === this.connection.url) {
                if (this.timeoutCounter > 0) this.timeoutCounter -= 100;
              }
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
              this.rpcUrlWithError = this.connection.url;
              errorMessage = this.errorMessage;
              console.error({
                errorMessage,
                message:
                  'The current RPC provider has a low rate-limit. We are applying a cooldown that will affect Pali performance. Modify the RPC URL in the network settings to resolve this issue.',
              });

              if (this.timeoutCounter <= 3000) {
                this.timeoutCounter += 500;
              }

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
              this.rpcUrlWithError = this.connection.url;
              console.error({
                errorMessage: errorMessage,
                message:
                  'Service Unavailable: The current provider(RPC) is not ready to handle the request, possibly due to being down for maintenance or overloaded.',
              });

              if (this.timeoutCounter <= 3000) {
                this.timeoutCounter += 500;
              }

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

  public canGetChainId = (isPossible: boolean) => {
    this.isPossibleGetChainId = isPossible;
  };
}
