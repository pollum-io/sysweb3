import { RestConfig, IRestConfig } from './rest.config';
import { IHttpClient } from '../i-http-client';

export const RestApi = (baseUrl: string) => {

  let config = RestConfig();

  config.baseUrl(baseUrl);

  const httpRequest = (url: string, method: string, data: any, options: RestApiOptions, queryParams: any) => {
    url = resolveUrl(url, options);

    if (!method || !url) {
      throw new Error('You must configure at least the http method and url');
    }

    const client: IHttpClient = config.protocolClient();

    return client.invoke({
      authToken: config.authToken(),
      url,
      body: data,
      method,
      queryParams,
      errorHook: config.errorHook(),
      ...options
    });
  }

  const configure = (): IRestConfig => {
    return config;
  }

  const resolveUrl = (url, options?) => {

    if (options && options.baseUrl !== undefined) {
      url = options.baseUrl + url;
    }
    else {
      url = config.baseUrl() + url;
    }

    return url;
  }

  const $post = (url: string, data?: any, options?: RestApiOptions, queryParams?: object): Promise<any> => {
    return httpRequest(url, 'POST', data, options, queryParams);
  }

  const $get = (url: string, queryParams?: object, options?: RestApiOptions): Promise<any> => {
    return httpRequest(url, 'GET', null, options, queryParams);
  }

  const $put = (url: string, data?: any, options?: RestApiOptions, queryParams?: object): Promise<any> => {
    return httpRequest(url, 'PUT', data, options, queryParams);
  }

  const $delete = (url: string, data?: any, options?: RestApiOptions, queryParams?: object): Promise<any> => {
    return httpRequest(url, 'DELETE', data, options, queryParams);
  }

  return {
    $delete,
    $get,
    $post,
    $put,
    httpRequest,
    resolveUrl,
    configure
  }
}

export class RestApiOptions {
  baseUrl?: string;
  headers?: any;
  noAuthHeader?: boolean;
  transformResponse?: (rawResponse) => any;
  retry?: number;
}

export class RestApiOptionsRequest extends RestApiOptions {
  errorHook?: (error) => void;
  queryParams?: any;
  authToken?: string;
  method: string;
  body: any;
  url: string;
}



