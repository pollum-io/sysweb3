import CryptoJS from 'crypto-js';

import { sysweb3Di } from '@pollum-io/sysweb3-core/src';

const storage = sysweb3Di.getStateStorageDb();

//TODO: completely remove set and get vault from utils
export const setEncryptedVault = (decryptedVault: any) => {
  const encryptedVault = CryptoJS.AES.encrypt(
    JSON.stringify(decryptedVault),
    storage.get('vault-keys').hash
  );

  storage.set('vault', encryptedVault.toString());
};

export const getDecryptedVault = () => {
  const vault = storage.get('vault');

  const { hash } = storage.get('vault-keys');

  const decryptedVault = CryptoJS.AES.decrypt(vault, hash).toString(
    CryptoJS.enc.Utf8
  );

  return JSON.parse(decryptedVault);
};
