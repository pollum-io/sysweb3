import { SyscoinTransactions } from '../src/transactions/syscoin';
import {
  CREATE_TOKEN_PARAMS,
  FAKE_PASSWORD,
  FAKE_SEED_PHRASE,
  SYS_TANENBAUM_UTXO_NETWORK,
} from './constants';
import { KeyringManager } from '@pollum-io/sysweb3-keyring';

describe('testing functions for sys txs', () => {
  const keyringManager = KeyringManager();
  const { confirmTokenCreation } = SyscoinTransactions();
  jest.setTimeout(50000);

  it('should create SPT tx', async () => {
    // Initializing wallet and setting seed, password and vault.
    keyringManager.validateSeed(String(FAKE_SEED_PHRASE));
    keyringManager.setWalletPassword(FAKE_PASSWORD);

    await keyringManager.createKeyringVault();
    await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );
    const { activeAccount } = keyringManager.getState();

    const { address } = activeAccount;

    const { txid } = await confirmTokenCreation({
      ...CREATE_TOKEN_PARAMS,
      receiver: address,
    });

    expect(typeof txid).toBe('string');
  });
});
