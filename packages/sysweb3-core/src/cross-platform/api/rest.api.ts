import { IRestConfig, RestConfig } from './rest.config';

export const RestApi = (baseUrl: string) => {
  const config = RestConfig();

  config.baseUrl(baseUrl);

  const httpRequest = (
    url: string,
    method: string,
    data: any,
    options: RestApiOptions = {},
    queryParams: any
  ) => {
    url = resolveUrl(url, options);

    if (!method || !url) {
      throw new Error('You must configure at least the http method and url');
    }

    const client = config.protocolClient();

    return client.invoke({
      authToken: config.authToken(),
      url,
      body: data,
      method,
      queryParams,
      errorHook: config.errorHook(),
      ...options,
    });
  };

  const configure = (): IRestConfig => {
    return config;
  };

  const resolveUrl = (url: string, options?: RestApiOptions) => {
    if (options && options.baseUrl !== undefined) {
      url = options.baseUrl + url;
    } else {
      url = config.baseUrl() + url;
    }

    return url;
  };

  const $post = (
    url: string,
    data?: any,
    options?: RestApiOptions,
    queryParams?: object
  ) => {
    return httpRequest(url, 'POST', data, options, queryParams);
  };

  const $get = (
    url: string,
    queryParams?: object,
    options?: RestApiOptions
  ) => {
    return httpRequest(url, 'GET', null, options, queryParams);
  };

  const $put = (
    url: string,
    data?: any,
    options?: RestApiOptions,
    queryParams?: object
  ) => {
    return httpRequest(url, 'PUT', data, options, queryParams);
  };

  const $delete = (
    url: string,
    data?: any,
    options?: RestApiOptions,
    queryParams?: object
  ) => {
    return httpRequest(url, 'DELETE', data, options, queryParams);
  };

  return {
    $delete,
    $get,
    $post,
    $put,
    httpRequest,
    resolveUrl,
    configure,
  };
};

export interface RestApiOptions {
  baseUrl?: string;
  headers?: any;
  noAuthHeader?: boolean;
  transformResponse?: (rawResponse: any) => any;
  retry?: number;
}

export interface RestApiOptionsRequest extends RestApiOptions {
  errorHook?: (error: any) => void;
  queryParams?: any;
  authToken?: string;
  method: string;
  body: any;
  url: string;
}
