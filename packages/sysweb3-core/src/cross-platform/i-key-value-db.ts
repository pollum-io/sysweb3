import { IStateStorageClient } from './clients/state-storage-db';

export interface IKeyValueDb {
  setClient(client?: IStateStorageClient): void;
  setPrefix(prefix: string): void;
  set(key: string, value: any): void;
  get(key: string): any;
  deleteItem(key: string): void;
}
