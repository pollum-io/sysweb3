
import { crossPlatformDi } from '../cross-platform-di';
import {IHttpClient} from '../i-http-client';

export const RestConfig = () => {
  let serviceBaseUrl;
  let serviceAuthToken;
  let serviceProtocolClient;
  let errorHookCallback: (error) => void;

  const services = {
    serviceAuthToken,
    serviceBaseUrl,
    serviceProtocolClient,
    errorHookCallback,
  }

  const baseUrl = (val?: string) => {
    if (val === undefined) {
      if (serviceBaseUrl === '') return '';
      return serviceBaseUrl || crossPlatformDi.getHttpClientBaseUrl();
    }

    serviceBaseUrl = val;

    return services;
  }

  const authToken = (val?: string) => {
    if (!val) {
      return serviceAuthToken;
    }

    serviceAuthToken = val;

    return services;
  }

  const protocolClient = (val?: IHttpClient) => {
    if (!val) {
      return serviceProtocolClient || crossPlatformDi.getHttpClient();
    }

    serviceProtocolClient = val;

    return services;
  }

  const errorHook = (callback?: (error) => void): any => {
    if (!callback) {
      return errorHookCallback;
    }

    errorHookCallback = callback;

    return services;
  }

  return {
    errorHook,
    protocolClient,
    authToken,
    baseUrl
  }
}

export interface IRestConfig {
  errorHook(callback?: (error) => void): any;
  protocolClient(val?: IHttpClient): any;
  authToken(val?: string): any;
  baseUrl(val?: string): any;
}