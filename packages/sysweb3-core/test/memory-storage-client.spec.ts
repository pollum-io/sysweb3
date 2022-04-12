import { MemoryStorageClient } from '../src/cross-platform/clients/memory-storage-client';

const MemoryStorage = MemoryStorageClient();
MemoryStorage.setItem('key', 'value');

describe('MemoryStorageClient', () => {
  //* getItem
  it('should retrieve a value from a key', () => {
    const key = MemoryStorage.getItem('key');
    expect(key).toEqual('value');
  });

  //* setItem
  it('should assigned a value to a key', () => {
    MemoryStorage.setItem('key1', 'value1');

    const key1 = MemoryStorage.getItem('key1');
    expect(key1).toEqual('value1');
  });

  //* removeItem
  it('should remove an item', () => {
    MemoryStorage.removeItem('key');

    const key = MemoryStorage.getItem('key');
    expect(key).toBeNull();
  });
});
