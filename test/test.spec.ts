import * as dotenv from 'dotenv';

dotenv.config();
import { KeyringManager } from '../packages/sysweb3-keyring/src/keyring-manager';
export const FAKE_SEED_PHRASE = process.env.SEED_PEACE_GLOBE;

describe('Validate Keyring Manager', () => {
  const keyringManager = KeyringManager();
  const password = 'Diversao@10';

  it('Should create=validate Keyring Manager', async () => {
    keyringManager.validateSeed(String(FAKE_SEED_PHRASE));
    keyringManager.setWalletPassword(password);
    expect(keyringManager.checkPassword(password)).toBeTruthy();
    const seed = keyringManager.getDecryptedMnemonic() as string;
    // expect to have 12 words
    expect(seed).toBeDefined();
    expect(seed.split(' ').length).toBe(12);
    await keyringManager.createKeyringVault();
  });

  it('Should logout wallet', () => {
    keyringManager.logout();
    expect(keyringManager.isUnlocked()).toBeFalsy();
    keyringManager.login(password);
    expect(keyringManager.unlockedByPassword()).toBeTruthy();
  });
});
