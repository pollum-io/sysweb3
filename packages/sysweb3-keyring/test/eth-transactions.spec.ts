import { KeyringManager } from '../../sysweb3-keyring/src/keyring-manager';
import { initialWalletState } from '../src/initial-state';
import { EthereumTransactions } from '../src/transactions/ethereum';
import { FAKE_PASSWORD, FAKE_SEED_PHRASE } from './constants';

describe('Ethereum Transaction ERC20 at Syscoin NEVM', () => {
  const { sendSignedErc20Transaction } = EthereumTransactions();

  const keyringManager = KeyringManager();

  jest.setTimeout(50000); // 20s

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
    const account2 = await keyringManager.addNewAccount('');
    expect(account2.label).toBe('Account 2');

    const wallet = keyringManager.getState();
    expect(wallet.activeAccount.id).toBe(1);
  }, 50000);

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

  //* setSignerNetwork
  it('should set the network', async () => {
    const mainnet = initialWalletState.networks.ethereum[57];
    await keyringManager.setSignerNetwork(mainnet, 'ethereum');

    const network = keyringManager.getNetwork();
    expect(network).toEqual(mainnet);
  });

  it('Should return a Send Signed ERC20 ( PSYS ) Transaction', async () => {
    const psysTransaction = await sendSignedErc20Transaction({
      networkUrl: 'https://rpc.ankr.com/syscoin',
      receiver: '0xd5e66a5d61690dd4d6675d1e9eb480ddd640fe06',
      tokenAddress: '0xE18c200A70908c89fFA18C628fE1B83aC0065EA4',
      tokenAmount: '0.11',
    });

    expect(typeof psysTransaction).toBe('object');
    expect(typeof psysTransaction.chainId).toBe('number');
    expect(typeof psysTransaction.type).toBe('number');
    expect(typeof psysTransaction.to).toBe('string');
    expect(typeof psysTransaction.from).toBe('string');
  });

  it('Should return a Send Signed ERC20 ( LUXY ) Transaction', async () => {
    const luxyTransaction = await sendSignedErc20Transaction({
      networkUrl: 'https://rpc.ankr.com/syscoin',
      receiver: '0xd5e66a5d61690dd4d6675d1e9eb480ddd640fe06',
      tokenAddress: '0x6b7a87899490ece95443e979ca9485cbe7e71522',
      tokenAmount: '0.11',
    });

    expect(typeof luxyTransaction).toBe('object');
    expect(typeof luxyTransaction.chainId).toBe('number');
    expect(typeof luxyTransaction.type).toBe('number');
    expect(typeof luxyTransaction.to).toBe('string');
    expect(typeof luxyTransaction.from).toBe('string');
  });
});

describe('Ethereum Transaction ERC721 at Mumbai', () => {
  const { sendSignedErc721Transaction } = EthereumTransactions();

  const keyringManager = KeyringManager();

  jest.setTimeout(50000); // 20s

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
    const account2 = await keyringManager.addNewAccount('');
    expect(account2.label).toBe('Account 2');

    const wallet = keyringManager.getState();
    expect(wallet.activeAccount.id).toBe(1);
  }, 50000);

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

  //* setSignerNetwork
  it('should set the network', async () => {
    const mainnet = initialWalletState.networks.ethereum[80001];
    await keyringManager.setSignerNetwork(mainnet, 'ethereum');

    const network = keyringManager.getNetwork();
    expect(network).toEqual(mainnet);
  });

  it('Should return a Send Signed ERC721 ( NFT ) Transaction at Mumbai', async () => {
    const nftTransaction = await sendSignedErc721Transaction({
      networkUrl: 'https://rpc.ankr.com/polygon_mumbai',
      receiver: '0xd5e66a5d61690dd4d6675d1e9eb480ddd640fe06',
      tokenAddress: '0xd19018f7946D518D316BB10FdFF118C28835cF7a',
      tokenId: 1,
    });

    expect(typeof nftTransaction).toBe('object');
    expect(typeof nftTransaction.chainId).toBe('number');
    expect(typeof nftTransaction.type).toBe('number');
    expect(typeof nftTransaction.to).toBe('string');
    expect(typeof nftTransaction.from).toBe('string');
  });
});
