import { RestApi } from './cross-platform/api/rest.api';
import { FetchRestService } from './cross-platform/clients/fetch.http';
import { IStateStorageClient } from './cross-platform/clients/state-storage-db';
import { crossPlatformDi } from './cross-platform/cross-platform-di';
import { IHttpClient } from './cross-platform/i-http-client';
import { IKeyValueDb } from './cross-platform/i-key-value-db';

export const SysWeb3Di = () => {
  const createRestApi = (baseUrl: string) => {
    return RestApi(baseUrl);
  };

  const useFetchHttpClient = (fetchClient?: any) => {
    // @ts-ignore
    registerHttpClient(FetchRestService(fetchClient));
  };

  const useLocalStorageClient = (storageClient?: IStateStorageClient) => {
    crossPlatformDi.registerStorageClient(storageClient);
  };

  const registerHttpClient = (client: IHttpClient, baseUrl?: string) => {
    crossPlatformDi.registerHttpClient(client, baseUrl);
  };

  const registerStorageClient = (client: IStateStorageClient) => {
    crossPlatformDi.registerStorageClient(client);
  };

  const getStateStorageDb = (): IKeyValueDb => {
    return crossPlatformDi.getStateStorageDb();
  };

  return {
    createRestApi,
    useFetchHttpClient,
    useLocalStorageClient,
    registerHttpClient,
    registerStorageClient,
    getStateStorageDb,
  };
};

export const sysweb3Di = SysWeb3Di();
