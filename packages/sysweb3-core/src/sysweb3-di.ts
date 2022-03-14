import {RestApi} from './cross-platform/api/rest.api';
import {IHttpClient} from './cross-platform/i-http-client';
import {crossPlatformDi} from './cross-platform/cross-platform-di';
import {IKeyValueDb} from './cross-platform/i-key-value-db';
import {FetchRestService} from './cross-platform/clients/fetch.http';
import {IStateStorageClient} from './cross-platform/clients/state-storage-db';

export const SysWeb3Di = () => {
  const createRestApi = (baseUrl: string) => {
    return RestApi(baseUrl);
  }

  const useFetchHttpClient = (fetchClient?) => {
    registerHttpClient(new FetchRestService(fetchClient));
  }

  const useLocalStorageClient = (storageClient?) => {
    crossPlatformDi.registerStorageClient(storageClient);
  }

  const registerHttpClient = (client: IHttpClient, baseUrl?: string) => {
    crossPlatformDi.registerHttpClient(client, baseUrl);
  }

  const registerStorageClient = (client: IStateStorageClient) => {
    crossPlatformDi.registerStorageClient(client);
  }

  const getStateStorageDb = (): IKeyValueDb => {
    return crossPlatformDi.getStateStorageDb();
  }

  return {
    createRestApi,
    useFetchHttpClient,
    useLocalStorageClient,
    registerHttpClient,
    registerStorageClient,
    getStateStorageDb
  }
}

export const sysweb3Di = SysWeb3Di();
