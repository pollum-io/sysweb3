import CryptoJS from 'crypto-js';

import { sysweb3Di } from '@pollum-io/sysweb3-core';
import { initialWalletState } from '@pollum-io/sysweb3-keyring';

const initialStorageState = {
  wallet: initialWalletState,
  network: initialWalletState.activeNetwork,
  signers: { _hd: null, _main: null },
  mnemonic: '',
  lastLogin: 0,
};

const storage = sysweb3Di.getStateStorageDb();

export const setEncryptedVault = (unencrypted: any) => {
  const unencryptedVault = storage.get('vault')
    ? getDecryptedVault()
    : initialStorageState;

  const vault = { ...unencryptedVault, ...unencrypted };

  const encryptedVault = CryptoJS.AES.encrypt(
    JSON.stringify(vault),
    storage.get('vault-keys').hash
  ).toString();

  storage.set('vault', encryptedVault);
};

export const getDecryptedVault = () => {
  try {
    const vault = storage.get('vault');

    const { hash } = storage.get('vault-keys');

    const decryptedVault = CryptoJS.AES.decrypt(vault, hash).toString(
      CryptoJS.enc.Utf8
    );

    return JSON.parse(decryptedVault);
  } catch (error) {
    throw new Error('No vault found.');
  }
};
