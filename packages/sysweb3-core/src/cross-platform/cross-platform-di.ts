import { MemoryStorageClient } from './clients/memory-storage-client';
import {
  IStateStorageClient,
  IStateStorageDb,
  StateStorageDb,
} from './clients/state-storage-db';
import { IHttpClient } from './i-http-client';
import { IKeyValueDb } from './i-key-value-db';

export const CrossPlatformDi = () => {
  //======================
  //   = HTTP Client =
  //======================
  let httpClient: IHttpClient;
  let httpClientBaseUrl = '';

  // Register the platform implementation for http service requests
  const registerHttpClient = (client: IHttpClient, baseUrl?: string) => {
    httpClient = client;
    httpClientBaseUrl = baseUrl || '';
  };

  const getHttpClient = (): IHttpClient => {
    return httpClient;
  };

  const getHttpClientBaseUrl = (): string => {
    return httpClientBaseUrl;
  };

  //======================
  //= State Storage =
  //======================
  const stateStorageDb: IStateStorageDb = StateStorageDb(MemoryStorageClient());

  const useBrowserLocalStorage = () => {
    stateStorageDb.setClient();
  };

  const registerStorageClient = (client?: IStateStorageClient) => {
    stateStorageDb.setClient(client);
  };

  const getStateStorageDb = (): IKeyValueDb => {
    return stateStorageDb;
  };

  return {
    registerHttpClient,
    getHttpClient,
    getHttpClientBaseUrl,
    useBrowserLocalStorage,
    registerStorageClient,
    getStateStorageDb,
  };
};

export const crossPlatformDi = CrossPlatformDi();
