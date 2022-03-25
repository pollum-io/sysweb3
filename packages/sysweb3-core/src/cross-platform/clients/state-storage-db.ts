import { IKeyValueDb } from './../i-key-value-db';

const defaultStorage = window.localStorage ? window.localStorage : undefined;

export const StateStorageDb = (
  storageClient: IStateStorageClient | undefined = defaultStorage
): IKeyValueDb => {
  let keyPrefix = 'sysweb3-';

  const setClient = (client?: IStateStorageClient) => {
    storageClient = client || defaultStorage;
  };

  const setPrefix = (prefix: string) => {
    if (!prefix) {
      prefix = 'sysweb3-';
    } else if (prefix.charAt(prefix.length - 1) !== '-') {
      prefix += '-';
    }
    keyPrefix = prefix;
  };

  const set = (key: string, value: any) => {
    if (!storageClient) return;

    storageClient.setItem(keyPrefix + key, JSON.stringify(value))
  };

  const get = (key: string): any => {
    if (!storageClient) return;

    const value = storageClient.getItem(keyPrefix + key);
    if (value) {
      return JSON.parse(value);
    }
  };

  const deleteItem = (key: string) => {
    if (!storageClient) return;

    storageClient.removeItem(keyPrefix + key);
  };

  return {
    setClient,
    setPrefix,
    set,
    get,
    deleteItem,
  };
};

export interface IStateStorageClient {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface IStateStorageDb {
  setClient(client?: IStateStorageClient): void;
  setPrefix(prefix: string): void;
  set(key: string, value: any): void;
  get(key: string): JSON;
  deleteItem(key: string): void;
}
