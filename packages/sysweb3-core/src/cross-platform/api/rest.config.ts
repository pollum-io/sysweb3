import { crossPlatformDi } from '../cross-platform-di';
import { IHttpClient } from '../i-http-client';

export const RestConfig = () => {
  let serviceBaseUrl: string;
  let serviceAuthToken: string;
  let serviceProtocolClient: IHttpClient;
  let errorHookCallback: (error: any) => void;

  const baseUrl = (val?: string) => {
    if (val === undefined) {
      if (serviceBaseUrl === '') return '';
      return serviceBaseUrl || crossPlatformDi.getHttpClientBaseUrl();
    }

    serviceBaseUrl = val;

    return serviceBaseUrl;
  };

  const authToken = (val?: string) => {
    if (!val) {
      return serviceAuthToken;
    }

    serviceAuthToken = val;

    return serviceAuthToken;
  };

  const protocolClient = (val?: IHttpClient) => {
    if (!val) {
      return serviceProtocolClient || crossPlatformDi.getHttpClient();
    }

    serviceProtocolClient = val;

    return serviceProtocolClient;
  };

  const errorHook = (callback?: (error: any) => void): any => {
    if (!callback) {
      return errorHookCallback;
    }

    errorHookCallback = callback;

    return errorHookCallback;
  };

  return {
    errorHook,
    protocolClient,
    authToken,
    baseUrl,
  };
};

export interface IRestConfig {
  errorHook(callback?: (error: any) => void): any;
  protocolClient(val?: IHttpClient): any;
  authToken(val?: string): any;
  baseUrl(val?: string): any;
}
