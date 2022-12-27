import { getDecryptedVault, setEncryptedVault, isBase64 } from '../src';
import { PASSWORD, UNENCRYPTED_VAULT } from './mocks';
import { sysweb3Di } from '@pollum-io/sysweb3-core';
import { KeyringManager } from '@pollum-io/sysweb3-keyring';

describe('storage tests', () => {
  const keyring = KeyringManager();
  const storage = sysweb3Di.getStateStorageDb();

  it('should set encrypted vault', () => {
    expect(() => getDecryptedVault()).toThrowError('No vault found.');

    keyring.setWalletPassword(PASSWORD);

    setEncryptedVault(UNENCRYPTED_VAULT);

    expect(isBase64(storage.get('vault'))).toBeTruthy();
  });

  it('should get decrypted vault', () => {
    expect(getDecryptedVault()).toStrictEqual(UNENCRYPTED_VAULT);
  });
});
