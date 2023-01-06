import { initialWalletState } from '../src/initial-state';
import { KeyringManager } from '../src/keyring-manager';
import {
  FAKE_PASSWORD,
  FAKE_SEED_PHRASE,
  SECOND_FAKE_SEED_PHRASE,
} from './constants';
import { web3Provider } from '@pollum-io/sysweb3-network';
import {
  getDecryptedVault,
  isValidEthereumAddress,
} from '@pollum-io/sysweb3-utils';

describe('keyring manager tests', () => {
  const keyringManager = KeyringManager();
  jest.setTimeout(50000); // 50s

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

  // * createSeed
  it('should create/get a seed', () => {
    const seed = keyringManager.createSeed();

    expect(seed).toBeDefined();
    expect(seed.split(' ').length).toBe(12);
  });

  // * seed
  it('should overwrite current seed', () => {
    keyringManager.validateSeed(String(FAKE_SEED_PHRASE));

    const seed = keyringManager.getDecryptedMnemonic();

    expect(seed).toBeDefined();
    expect(seed.split(' ').length).toBe(12);
  });

  //* createKeyringVault
  it('should create the keyring vault', async () => {
    const account = await keyringManager.createKeyringVault();

    console.log({ account });

    const { wallet, network } = getDecryptedVault();

    expect(account).toBeDefined();
    expect(Object.values(wallet.accounts).length).toBe(1);
    expect(network).toStrictEqual(initialWalletState.activeNetwork);
  });

  // * addNewAccount
  it('should add a new account', async () => {
    const account = await keyringManager.addNewAccount(undefined);

    expect(account.label).toBe('Account 2');

    const wallet = keyringManager.getState();

    expect(wallet.activeAccount.id).toBe(1);
  });

  // * setActiveAccount
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
    const privateKey = keyringManager.getPrivateKeyByAccountId(1);

    expect(privateKey).toBeDefined();
    expect(privateKey.length).toBeGreaterThan(50);
  });

  it('should throw an error if given an invalid id', () => {
    expect(() => {
      keyringManager.getPrivateKeyByAccountId(3);
    }).toThrow('Account not found');
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
    const seed = keyringManager.getSeed(FAKE_PASSWORD);

    expect(seed).toBe(FAKE_SEED_PHRASE);
    expect(() => {
      keyringManager.getSeed('wrongp@ss123');
    }).toThrow('Invalid password.');
  });

  //* getLatestUpdateForAccount
  it('should get an updated wallet', async () => {
    const { activeAccount, activeNetwork } =
      await keyringManager.getLatestUpdateForAccount();

    expect(activeAccount.address).toBeDefined();
    expect(activeAccount.id).toBe(0);
    expect(activeNetwork.chainId).toBe(57);
  });

  //* setSignerNetwork polygon
  it('should set polygon mainnet as the active network', async () => {
    const payload = initialWalletState.networks.ethereum[137];
    const response3 = await keyringManager.setSignerNetwork(
      payload,
      'ethereum'
    );

    const { network, wallet } = getDecryptedVault();

    console.log({ network, response3, web3Provider });

    const isValidAddress = isValidEthereumAddress(wallet.activeAccount.address);

    expect(network).toEqual(payload);
    expect(web3Provider.connection.url).toEqual(payload.url);
    expect(isValidAddress).toBeTruthy();
  });

  //* setSignerNetwork utxo syscoin mainnet
  it('should set utxo mainnet as the active network', async () => {
    console.log('before all utxo', getDecryptedVault());
    const { network: networkBefore } = getDecryptedVault();

    console.log({
      networkBefore,
      n: keyringManager.getNetwork(),
      web3Provider,
    });

    const payload = initialWalletState.networks.syscoin[57];
    console.log({ payload });
    const response = await keyringManager.setSignerNetwork(payload, 'syscoin');

    console.log({ done: payload });
    const { network, wallet } = getDecryptedVault();

    console.log({ network, response, web3Provider });

    const isValidAddress = isValidEthereumAddress(wallet.activeAccount.address);

    expect(network).toEqual(payload);
    expect(web3Provider.connection.url).toEqual(networkBefore.url);
    expect(isValidAddress).toBeFalsy();
  });

  it('should create an account with custom label', async () => {
    const newAccount = await keyringManager.addNewAccount('Teddy');

    expect(newAccount).toBeTruthy();
    expect(newAccount.label).toBe('Teddy');

    const { wallet } = getDecryptedVault();

    expect(wallet.accounts[2].label).toBe('Teddy');
  });

  //* forgetMainWallet
  it('should forget wallet / reset to initial state', async () => {
    keyringManager.forgetMainWallet(FAKE_PASSWORD);

    const { wallet } = getDecryptedVault();

    expect(wallet).toEqual(initialWalletState);
  });
});

describe('Account derivation with another seed in keyring', () => {
  const keyringManager = KeyringManager();

  jest.setTimeout(50000); // 50s

  it('should derivate a new account with specific address', async () => {
    keyringManager.validateSeed(SECOND_FAKE_SEED_PHRASE);
    keyringManager.setWalletPassword(FAKE_PASSWORD);

    const mainnet = initialWalletState.networks.ethereum[57];
    await keyringManager.setSignerNetwork(mainnet, 'ethereum');

    const account2 = await keyringManager.addNewAccount();
    expect(account2.address).toBe('0x2cfec7d3f6c02b180619c169c5cb8123c8653d74');

    const account3 = await keyringManager.addNewAccount();
    expect(account3.address).toBe('0x871157acb257c4269b1d2312c55e1adfb352c2cb');

    const account4 = await keyringManager.addNewAccount();
    expect(account4.address).toBe('0x0c947b39688c239e1c7fd124cf35b7ad304532c5');
  });
});
