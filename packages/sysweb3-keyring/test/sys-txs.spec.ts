import { KeyringManager } from '../src/keyring-manager';
import { SyscoinTransactions } from '../src/transactions/syscoin';
import {
  CREATE_TOKEN_PARAMS,
  DATA,
  FAKE_PASSWORD,
  FAKE_SEED_PHRASE,
  SYS_TANENBAUM_UTXO_NETWORK,
} from './constants';

describe('testing functions for sys txs', () => {
  const keyringManager = KeyringManager();
  const {
    confirmTokenCreation,
    getRecommendedFee,
    confirmMintNFT,
    confirmTokenMint,
    // confirmNftCreation,
    // confirmUpdateToken,
    // sendTransaction,
    // signTransaction,
  } = SyscoinTransactions();

  //--------------------------------------------------------Tests for initialize wallet state----------------------------------------------------

  //* validateSeed
  it('should validate a seed / add mnemonic', () => {
    const wrong = keyringManager.validateSeed('invalid seed');
    const right = keyringManager.validateSeed(String(FAKE_SEED_PHRASE));

    expect(wrong).toBe(false);
    expect(right).toBe(true);
  });

  //* setWalletPassword / checkPassword
  it('should set and check the password', () => {
    keyringManager.setWalletPassword(FAKE_PASSWORD);

    const wrong = keyringManager.checkPassword('wrongp@ss123');
    const right = keyringManager.checkPassword(FAKE_PASSWORD);

    expect(wrong).toBe(false);
    expect(right).toBe(true);
  });

  //* createSeed
  it('should create/get a seed', () => {
    const seed = keyringManager.createSeed() as string;
    expect(seed).toBeDefined();
    // expect to have 12 words
    expect(seed.split(' ').length).toBe(12);
  });

  it('should overwrite current seed', () => {
    keyringManager.validateSeed(String(FAKE_SEED_PHRASE));
    const seed = keyringManager.getDecryptedMnemonic() as string;
    // expect to have 12 words
    expect(seed).toBeDefined();
    expect(seed.split(' ').length).toBe(12);
  });

  // * addNewAccount
  it('should add a new account', async () => {
    const account2 = await keyringManager.addNewAccount(undefined);
    expect(account2.label).toBe('Account 2');

    const wallet = keyringManager.getState();
    expect(wallet.activeAccount.id).toBe(1);
  });

  //* setActiveAccount
  it('should set the active account', () => {
    keyringManager.setActiveAccount(0);

    const wallet = keyringManager.getState();
    expect(wallet.activeAccount.id).toBe(0);
  });

  //* getSeed
  it('should get the seed', async () => {
    const seed = keyringManager.getSeed(FAKE_PASSWORD);
    expect(seed).toBe(FAKE_SEED_PHRASE);
    expect(() => {
      keyringManager.getSeed('wrongp@ss123');
    }).toThrow('Invalid password.');
  });

  //--------------------------------------------------------SyscoinTransactions Tests----------------------------------------------------
  jest.setTimeout(70000);
  it('should create SPT tx', async () => {
    // Initializing wallet and setting seed, password and vault.
    const { address } = await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );

    const { txid } = await confirmTokenCreation({
      ...CREATE_TOKEN_PARAMS,
      receiver: address,
    });

    expect(typeof txid).toBe('string');
  });

  it('should confirm mint token', async () => {
    const { txid } = await confirmTokenMint(DATA['mintToken']);

    expect(typeof txid).toBe('string');
  });

  it('should confirm mint NFT', async () => {
    const { txid } = await confirmMintNFT(DATA['mintNft']);

    expect(typeof txid).toBe('string');
  });

  it('should get recommended fee', async () => {
    const { explorer } = SYS_TANENBAUM_UTXO_NETWORK;
    const fee = await getRecommendedFee(explorer);

    expect(typeof fee).toBe('number');
  });
});
