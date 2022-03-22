import { web3Provider } from '@syspollum/sysweb3-network';
import { AES } from 'crypto-js';
import Web3 from 'web3';
import { Web3Accounts } from '../src/accounts/eth-accounts';
import {
  FAKE_ADDRESS,
  FAKE_PASSWORD,
  FAKE_PRIV_KEY,
  FAKE_SEED_PHRASE,
} from './constants';

describe('Web3Accounts', () => {
  const {
    getBalance,
    createAccount,
    importAccount,
    getNftsByAddress,
    getTokens,
    sendTransaction,
    setActiveNetwork,
  } = Web3Accounts();

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
    const encryptedMnemonic = AES.encrypt(
      FAKE_SEED_PHRASE,
      FAKE_PASSWORD
    ).toString();

    const importedAccount = importAccount(encryptedMnemonic, FAKE_PASSWORD);

    expect(importedAccount).toBeTruthy();
    expect(importedAccount.address).toBeTruthy();
  });

  it('should get user NFTs', async () => {
    const userNFT = await getNftsByAddress(
      '0xa3d42513a1affe8d0862cf51df6145523837393a'
    );
    expect(userNFT).not.toBeNull();
    const blockNumber = userNFT[0].blockNumber;
    expect(blockNumber.length).toBeGreaterThan(0);
  });

  it('should get tokens', async () => {
    const tokens = await getTokens(
      '0xa3d42513a1affe8d0862cf51df6145523837393a'
    );
    expect(tokens).not.toBeNull();
    if (tokens?.length > 0) {
      const firstTokenValue = tokens[0].value;
      expect(typeof firstTokenValue).toBe('number');
    }
  });

  //* setActiveNetwork
  it('should change the network', () => {
    // 5700 = testnet chainId
    setActiveNetwork(5700);

    const provider = web3Provider.currentProvider;
    const { HttpProvider } = Web3.providers;

    expect(provider).toBeInstanceOf(HttpProvider);
    if (!(provider instanceof HttpProvider)) return;

    expect(provider.host).toBe('https://rpc.tanenbaum.io/');
  });

  jest.setTimeout(15000);

  it('should send a transaction', async () => {
    // change to Rinkeby network
    setActiveNetwork(4);
    const transaction = await sendTransaction(
      // test web3 account
      '0x6e578c2227bc4629794e566610209c9cb7a35341f13de4ba886a59a4e11b7d1e',
      // Pali web3 account
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      0.01
    );

    const blockNumber = transaction.blockNumber;
    expect(typeof blockNumber).toBe('number');
  });
});
