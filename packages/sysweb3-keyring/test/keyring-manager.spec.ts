import { initialWalletState } from '../src/initial-state';
import { KeyringManager } from '../src/keyring-manager';
import { EthereumTransactions } from '../src/transactions/ethereum';
import {
  FAKE_PASSWORD,
  FAKE_SEED_PHRASE,
  SYS_EVM_NETWORK,
  FAKE_ADDRESS,
} from './constants';
import * as sysweb3 from '@pollum-io/sysweb3-core';
import { INetwork } from '@pollum-io/sysweb3-utils';

describe('', () => {
  const keyringManager = KeyringManager();
  const ethereumTransactions = EthereumTransactions();
  const storage = sysweb3.sysweb3Di.getStateStorageDb();

  jest.setTimeout(60000); // 20s

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
    const privateKey = keyringManager.getPrivateKeyByAccountId(id);

    expect(privateKey).toBeDefined();
    expect(privateKey.length).toBeGreaterThan(50);

    id = 3; // id 3 does not exist
    expect(() => {
      keyringManager.getPrivateKeyByAccountId(id);
    }).toThrow('Account not found');
  });

  // //* setSignerNetwork
  // it('should set the network', async () => {
  //   const testnet = networks.syscoin[5700];
  //   await keyringManager.setSignerNetwork(testnet, 'syscoin');

  //   const network = keyringManager.getNetwork();
  //   expect(network).toEqual(testnet);
  // });

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

  //* hasHdMnemonic
  // it('should have a mnemonic', async () => {
  //   const hasMnemonic = keyringManager.hasHdAccounts();
  //   expect(hasMnemonic).toBe(true);
  // });

  // //* removeNetwork
  // it('should remove a network', async () => {
  //   keyringManager.removeNetwork('syscoin', 57);

  //   const wallet = keyringManager.getState();
  //   expect(57 in wallet.networks.syscoin).toBe(false);
  // });

  //* getLatestUpdateForAccount
  it('should get an updated account', async () => {
    const account = await keyringManager.getLatestUpdateForAccount();

    expect(account).toBeDefined();
  });

  //* forgetSigners
  // it('should forget the signers', async () => {
  //   keyringManager.forgetSigners();

  //   const signers = storage.get('signers');

  //   expect(signers._hd).toBeNull();
  //   expect(signers._main).toBeNull();
  // });

  //* forgetMainWallet
  it('should forget wallet / reset to initial state', async () => {
    keyringManager.forgetMainWallet(FAKE_PASSWORD);

    const wallet = keyringManager.getState();
    expect(wallet).toEqual(initialWalletState);
  });
  //-----------------------------------------------------------------------------------------------EthereumTransaction Tests----------------------------------------------------

  it('Validate get nounce', async () => {
    const { window } = global;

    if (window === undefined) {
      const nonce = await ethereumTransactions.getRecommendedNonce(
        FAKE_ADDRESS
      );

      expect(typeof nonce).toBe('number');
      return;
    }
    const account = await keyringManager.setSignerNetwork(
      SYS_EVM_NETWORK as INetwork,
      'ethereum'
    );

    const address = account.address;
    const nonce = await ethereumTransactions.getRecommendedNonce(address);

    expect(typeof nonce).toBe('number');
  });

  it('validate toBigNumber method', async () => {
    const number = 1;

    const toBigNumber = ethereumTransactions.toBigNumber(number);

    expect(toBigNumber._isBigNumber).toBe(true);
  });
  //TODO: Create Test for getFeeDataWithDynamicMaxPriorityFeePerGas
  //TODO: Create Test for getTxGasLimit for this one we'll need to generate a mock transaction, we can use metamask example but with our addresses from the signer: https://docs.metamask.io/guide/sending-transactions.html#sending-transactions
  //TODO: Create test for sendFormattedTX
  //TODO: Create test for signTypedDataV4
});
