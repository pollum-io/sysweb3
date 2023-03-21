import { KeyringManager } from '../src/keyring-manager';
import { KeyringAccountType } from '../src/types';
import {
  CREATE_TOKEN_PARAMS,
  DATA,
  FAKE_PASSWORD,
  PEACE_SEED_PHRASE,
  SYS_TANENBAUM_UTXO_NETWORK,
} from './constants';
import { IKeyringTokenType } from '@pollum-io/sysweb3-utils/src';

describe('testing functions for the new-sys txs', () => {
  const keyringManager = new KeyringManager();
  let address;
  //TODO: remove intialisation test and substitue for globalSetup
  // beforeAll(async () => {
  //   console.log('Before ALL');
  //   const newSeed = keyringManager.setSeed(String(PEACE_SEED_PHRASE));
  //   console.log('NewSeed', newSeed);
  //   expect(newSeed).toBe(String(PEACE_SEED_PHRASE));
  //   const right =  keyringManager.checkPassword(FAKE_PASSWORD);
  //   console.log('checkPassword', right);
  //   expect(right).toBe(true);
  //   const account = await keyringManager.createKeyringVault();
  //   console.log('account', account);
  //   expect(account).toBeDefined();
  //   const account2 = await keyringManager.addNewAccount(undefined);
  //   console.log('account2', account2);
  //   expect(account2.label).toBe('Account 2');
  //   return Promise.resolve();
  // }, 180000);

  //--------------------------------------------------------Tests for initialize wallet state----------------------------------------------------

  it('should validate a seed', () => {
    const seed = keyringManager.createNewSeed();
    const wrong = keyringManager.isSeedValid('invalid seed');
    if (seed) {
      expect(keyringManager.isSeedValid(seed)).toBe(true);
    }
    expect(wrong).toBe(false);
    expect(keyringManager.isSeedValid(String(PEACE_SEED_PHRASE))).toBe(true);
    const newSeed = keyringManager.setSeed(String(PEACE_SEED_PHRASE));
    expect(newSeed).toBe(String(PEACE_SEED_PHRASE));
  });

  //* setWalletPassword / checkPassword
  it('should set and check the password', () => {
    keyringManager.setWalletPassword(FAKE_PASSWORD);

    const wrong = keyringManager.checkPassword('wrongp@ss123');
    const right = keyringManager.checkPassword(FAKE_PASSWORD);

    expect(wrong).toBe(false);
    expect(right).toBe(true);
  });

  it('should overwrite current seed', () => {
    keyringManager.isSeedValid(String(PEACE_SEED_PHRASE));
    const seed = keyringManager.getSeed(FAKE_PASSWORD) as string;
    // expect to have 12 words
    expect(seed).toBeDefined();
    expect(seed.split(' ').length).toBe(12);
  });

  //* createKeyringVault
  it('should create the keyring vault', async () => {
    const account = await keyringManager.createKeyringVault();
    console.log('this account', account);

    address = account.address;
    expect(account).toBeDefined();
  });

  /* addNewAccount */
  it('should add a new account', async () => {
    const account2 = await keyringManager.addNewAccount(undefined);
    expect(account2.label).toBe('Account 2');

    const wallet = keyringManager.getState();
    expect(wallet.activeAccountId).toBe(1);
  });

  //--------------------------------------------------------SyscoinTransactions Tests----------------------------------------------------
  it('should create SPT tx', async () => {
    // Initializing wallet and setting seed, password and vault.
    const a = await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );
    console.log('setSignerNetwork', a);
    const wallet = keyringManager.getState();
    expect(wallet.activeAccountId).toBe(1);
    const activeUTXOAccount = keyringManager.getActiveUTXOAccountState();
    console.log(activeUTXOAccount);
    address = activeUTXOAccount.address;
    console.log('Address', address);

    const { txid } =
      await keyringManager.syscoinTransaction.confirmTokenCreation({
        ...CREATE_TOKEN_PARAMS,
        receiver: address,
      });

    // This test only run individually.

    expect(typeof txid).toBe('string');
  }, 180000);

  it('should create NFT token', async () => {
    await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );

    const tx = { ...DATA['createNft'], issuer: address };

    const { success } =
      keyringManager.syscoinTransaction.confirmNftCreation(tx);

    expect(success).toBeTruthy();
  }, 180000);

  it('should send native token', async () => {
    await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );

    const tx = { ...DATA['send'], receivingAddress: address, sender: address };
    const { txid } = await keyringManager.syscoinTransaction.sendTransaction(
      tx
    );

    // This test only run individually.

    expect(txid).toBeDefined();
  }, 180000);

  it('should generate signPSBT json', async () => {
    await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );
    const res = await keyringManager.syscoinTransaction.signTransaction(
      DATA['sign'],
      true,
      false
    );

    expect(res).toBeDefined();
  }, 180000);

  it('should sign and send tx', async () => {
    await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );
    const res = await keyringManager.syscoinTransaction.signTransaction(
      DATA['signAndSend'],
      false
    );

    expect(res).toBeDefined();
  }, 180000);

  it('should confirm update token', async () => {
    await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );
    keyringManager.setActiveAccount(0, KeyringAccountType.HDAccount);
    const tx = { ...DATA['updateToken'], receiver: address };
    const { txid } = await keyringManager.syscoinTransaction.confirmUpdateToken(
      tx
    );

    // If the asset isn't minted, the test will fail.

    expect(txid).toBeDefined();
  }, 180000);

  it('should get recommended fee', async () => {
    const { explorer } = SYS_TANENBAUM_UTXO_NETWORK;
    const fee = await keyringManager.syscoinTransaction.getRecommendedFee(
      explorer
    );

    expect(typeof fee).toBe('number');
  }, 90000);
});
