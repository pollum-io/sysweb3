import CryptoJS from 'crypto-js';
import { importAccount } from './web3-import';
import {
  FAKE_SEED_PHRASE,
  FAKE_PASSWORD,
  FAKE_PRIV_KEY,
  FAKE_ADDRESS,
} from '../test-constants/test-constants';

describe('import account', () => {
  it('should import an account using a private key', async () => {
    const importedAccount = importAccount(FAKE_PRIV_KEY, '');

    expect(importedAccount).toBeTruthy();
    expect(importedAccount.address).toEqual(FAKE_ADDRESS);
  });

  it('should import an account using a seed phrase (mnemonic)', async () => {
    //* encrypt the mnemonic
    const encryptedMnemonic = CryptoJS.AES.encrypt(
      FAKE_SEED_PHRASE,
      FAKE_PASSWORD
    ).toString();

    const importedAccount = importAccount(encryptedMnemonic, FAKE_PASSWORD);
    console.log(importedAccount);

    expect(importedAccount).toBeTruthy();
    expect(importedAccount.address).toBeTruthy();
  });
});
