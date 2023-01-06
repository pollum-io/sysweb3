import {
  getDecryptedVault,
  setEncryptedVault,
  isBase64,
  getSigners,
} from '../src';
import { ENCRYPTED_SEED, PASSWORD, UNENCRYPTED_VAULT } from './mocks';
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

    setEncryptedVault({ mnemonic: ENCRYPTED_SEED });

    expect(isBase64(storage.get('vault'))).toBeTruthy();

    console.log({ signers: getSigners() });
  });

  it('should get decrypted vault', () => {
    expect(getDecryptedVault()).toStrictEqual({
      ...UNENCRYPTED_VAULT,
      mnemonic: ENCRYPTED_SEED,
    });
  });
});
