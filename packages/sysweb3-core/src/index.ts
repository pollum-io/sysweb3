interface IStateStorageClient {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

interface IStateStorageDb {
  setClient(client?: IStateStorageClient): void;
  setPrefix(prefix: string): void;
  set(key: string, value: any): void;
  get(key: string): JSON;
  deleteItem(key: string): void;
}

export interface IKeyValueDb {
  setClient(client?: IStateStorageClient): void;
  setPrefix(prefix: string): void;
  set(key: string, value: any): void;
  get(key: string): any;
  deleteItem(key: string): void;
}

declare let window: any;
const defaultStorage =
  typeof window !== 'undefined' ? window.localStorage : undefined;

const StateStorageDb = (
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

    storageClient.setItem(keyPrefix + key, JSON.stringify(value));
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

const MemoryStorageClient = (): IStateStorageClient => {
  const memory: any = {};

  const setItem = (key: string, value: any) => {
    memory[key] = value;
  };

  const getItem = (key: string): any => {
    return memory[key];
  };

  const removeItem = (key: string) => {
    memory[key] = null;
  };

  return {
    setItem,
    getItem,
    removeItem,
  };
};

const CrossPlatformDi = () => {
  //======================
  //= State Storage =
  //======================
  const stateStorageDb: IStateStorageDb = StateStorageDb(MemoryStorageClient());

  const getStateStorageDb = (): IKeyValueDb => {
    return stateStorageDb;
  };

  return {
    getStateStorageDb,
  };
};

const crossPlatformDi = CrossPlatformDi();

const SysWeb3Di = () => {
  const getStateStorageDb = (): IKeyValueDb => {
    return crossPlatformDi.getStateStorageDb();
  };

  return {
    getStateStorageDb,
  };
};

export const sysweb3Di = SysWeb3Di();
