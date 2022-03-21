import {
  FAKE_ADDRESS,
  FAKE_PASSWORD,
  FAKE_PRIV_KEY,
  FAKE_SEED_PHRASE,
} from '../../../test/constants';
import { Web3Accounts } from '../src/accounts/eth-accounts';

describe('Web3Accounts', () => {
  const { getBalance, createAccount, importAccount } = Web3Accounts();

  it('should create an account', () => {
    const newAccount = createAccount();

    expect(newAccount).toBeTruthy();
    expect(newAccount.address).toBeTruthy();
  });

  it('should get balance', async () => {
    const balance = await getBalance(FAKE_ADDRESS);
    expect(typeof balance).toBe('number');
  });

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

    expect(importedAccount).toBeTruthy();
    expect(importedAccount.address).toBeTruthy();
  });
});
