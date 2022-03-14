import {IStateStorageClient} from './state-storage-db';

export const MemoryStorageClient = (): IStateStorageClient => {
  let memory = {};

  const setItem = (key: string, value: any) =>{
    memory[key] = value;
  }

  const getItem = (key: string): any =>{
    return memory[key];
  }

  const removeItem = (key: string) =>{
    memory[key] = null;
  }

  return {
    setItem,
    getItem,
    removeItem
  }
}

