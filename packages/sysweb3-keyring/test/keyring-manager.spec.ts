import { KeyringManager } from '../src/keyring-manager';
import { FAKE_PASSWORD, FAKE_SEED_PHRASE } from './constants';
import { networks } from '@pollum-io/sysweb3-network';
import { initialWalletState } from '@pollum-io/sysweb3-utils';

describe('', () => {
  const keyringManager = KeyringManager();

  jest.setTimeout(20000); // 20s

  //* validateSeed
  it('should validate a seed / add mnemonic', () => {
    const wrong = keyringManager.validateSeed('invalid seed');
    const right = keyringManager.validateSeed(FAKE_SEED_PHRASE);

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

  //* getState
  it('should get the state', () => {
    const state = keyringManager.getState();

    expect(state).toBeDefined();
  });

  //* createKeyringVault
  it('should create the keyring vault', async () => {
    const account = await keyringManager.createKeyringVault();

    expect(account).toBeDefined();
  });

  //* addNewAccount
  it('should add a new account', async () => {
    const account = await keyringManager.addNewAccount(undefined);
    expect(account.label).toBe('Account 2');

    const wallet = keyringManager.getState();
    expect(wallet.activeAccount.id).toBe(1);
  });

  //* setActiveAccount
  it('should set the active account', () => {
    keyringManager.setActiveAccount(0);

    const wallet = keyringManager.getState();
    expect(wallet.activeAccount.id).toBe(0);
  });

  //* getAccountById
  it('should get an account by id', () => {
    const id = 1;
    const account1 = keyringManager.getAccountById(id);

    expect(account1).toBeDefined();
    expect(account1.id).toBe(id);
  });

  //* getPrivateKeyByAccountId
  it('should get an account private key by id', () => {
    let id = 1;
    let privateKey = keyringManager.getPrivateKeyByAccountId(id);

    expect(privateKey).toBeDefined();
    expect(privateKey.length).toBeGreaterThan(50);

    id = 3; // id 3 does not exist
    privateKey = keyringManager.getPrivateKeyByAccountId(id);

    expect(privateKey).toBeNull();
  });

  //* getAccounts
  it('should get accounts', () => {
    const accounts = keyringManager.getAccounts();

    expect(accounts).toBeDefined();
    expect(accounts.length).toBe(2);
  });

  //* removeAccount
  it('should remove an account', async () => {
    keyringManager.removeAccount(1);

    const accounts = keyringManager.getAccounts();
    expect(accounts.length).toBe(1);
  });

  //* getNetwork
  it('should get the active network', async () => {
    const activeNetwork = keyringManager.getNetwork();

    const syscoinChainId = 57;
    expect(activeNetwork.chainId).toBe(syscoinChainId);
  });

  //* setSignerNetwork
  it('should set the network', async () => {
    const testnet = networks.syscoin[5700];
    await keyringManager.setSignerNetwork(testnet, 'syscoin');

    const network = keyringManager.getNetwork();
    expect(network).toEqual(testnet);
  });

  //* getEncryptedXprv
  it('should get the encrypted private key', async () => {
    const xprv = keyringManager.getEncryptedXprv();

    expect(xprv).toBeDefined();
    expect(xprv.substring(1, 4)).not.toEqual('prv');
  });

  //* getAccountXpub
  it('should get the public key', async () => {
    const xpub = keyringManager.getAccountXpub();

    expect(xpub).toBeDefined();
    expect(xpub.substring(1, 4)).toEqual('pub');
  });

  //* getSeed
  it('should get the seed', async () => {
    let seed = keyringManager.getSeed(FAKE_PASSWORD);
    expect(seed).toBe(FAKE_SEED_PHRASE);

    seed = keyringManager.getSeed('wrongp@ss123');
    expect(seed).toBeNull();
  });

  //* hasHdMnemonic
  it('should have a mnemonic', async () => {
    const hasMnemonic = keyringManager.hasHdMnemonic();
    expect(hasMnemonic).toBe(true);
  });

  //* removeNetwork
  it('should remove a network', async () => {
    keyringManager.removeNetwork('syscoin', 57);

    const wallet = keyringManager.getState();
    expect(57 in wallet.networks.syscoin).toBe(false);
  });

  //* forgetMainWallet
  it('should forget wallet / reset to initial state', async () => {
    keyringManager.forgetMainWallet(FAKE_PASSWORD);

    const wallet = keyringManager.getState();
    expect(wallet).toEqual(initialWalletState);
  });

  //* hasHdMnemonic
  it('should not have a mnemonic', async () => {
    const hasMnemonic = keyringManager.hasHdMnemonic();
    expect(hasMnemonic).toBe(false);
  });
});
