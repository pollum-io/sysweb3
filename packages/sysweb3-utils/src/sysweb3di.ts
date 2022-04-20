export interface IHttpClient {
  invoke(options: RestApiOptionsRequest): Promise<any>;
}

export interface IRestConfig {
  errorHook(callback?: (error: any) => void): any;
  protocolClient(val?: IHttpClient): any;
  authToken(val?: string): any;
  baseUrl(val?: string): any;
}

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

export type PutPostRequest = {
  url: string;
  data?: any;
  options?: RestApiOptions;
  queryParams?: object;
};

export interface RestApi {
  $delete: () => Promise<any>;
  $get: (
    url: string,
    queryParams?: object,
    options?: RestApiOptions
  ) => Promise<any>;
  $post: (request: PutPostRequest) => Promise<any>;
  $put: (request: PutPostRequest) => Promise<any>;
  httpRequest: (
    url: string,
    method: string,
    data: any,
    options: RestApiOptions,
    queryParams: any
  ) => Promise<any>;
  resolveUrl: (url: string, options?: RestApiOptions) => string;
  configure: () => IRestConfig;
}

export interface IStateStorageClient {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface IKeyValueDb {
  setClient(client?: IStateStorageClient): void;
  setPrefix(prefix: string): void;
  set(key: string, value: any): void;
  get(key: string): any;
  deleteItem(key: string): void;
}

export interface SysWeb3Di {
  createRestApi: () => RestApi;
  useFetchHttpClient: () => void;
  useLocalStorageClient: () => void;
  registerHttpClient: () => void;
  registerStorageClient: () => void;
  getStateStorageDb: () => IKeyValueDb;
}
