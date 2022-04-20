import { AES } from 'crypto-js';
import Web3 from 'web3';

import { Web3Accounts } from '../src/accounts/eth-accounts';
import {
  FAKE_ADDRESS,
  FAKE_PASSWORD,
  FAKE_PRIV_KEY,
  FAKE_SEED_PHRASE,
} from './constants';
import { web3Provider, setActiveNetwork } from '@pollum-io/sysweb3-network';

describe('Web3Accounts', () => {
  const {
    getBalance,
    createAccount,
    importAccount,
    getNftsByAddress,
    getTokens,
    sendTransaction,
  } = Web3Accounts();

  //* createAccount
  it('should create an account', () => {
    const newAccount = createAccount();

    expect(newAccount).toBeTruthy();
    expect(newAccount.address).toBeTruthy();
  });

  //* getBalance
  it('should get an account balance', async () => {
    const balance = await getBalance(FAKE_ADDRESS);
    expect(typeof balance).toBe('number');
  });

  it('should import an account using a private key', async () => {
    const importedAccount = importAccount(FAKE_PRIV_KEY, '');

    expect(importedAccount).toBeTruthy();
    expect(importedAccount.address).toEqual(FAKE_ADDRESS);
  });

  //* importAccount
  it('should import an account using a seed phrase (mnemonic)', async () => {
    // encrypt the mnemonic
    const encryptedMnemonic = AES.encrypt(
      FAKE_SEED_PHRASE,
      FAKE_PASSWORD
    ).toString();

    const importedAccount = importAccount(encryptedMnemonic, FAKE_PASSWORD);

    expect(importedAccount).toBeTruthy();
    expect(importedAccount.address).toBeTruthy();
  });

  //* getNftsByAddress
  it('should get all NFTs from an account', async () => {
    const userNFT = await getNftsByAddress(
      '0xa3d42513a1affe8d0862cf51df6145523837393a'
    );
    expect(userNFT).not.toBeNull();
    const blockNumber = userNFT[0].blockNumber;
    expect(blockNumber.length).toBeGreaterThan(0);
  });

  //* getTokens
  it('should get the tokens from an account', async () => {
    const tokens = await getTokens(
      '0xa3d42513a1affe8d0862cf51df6145523837393a'
    );
    expect(tokens).not.toBeNull();
    if (tokens.length > 0) {
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

  //* sendTransaction
  it('should send a transaction', async () => {
    // change to Rinkeby network
    setActiveNetwork(4);
    const transaction = await sendTransaction(
      // Pali web3 account
      '0x0beaDdE9e116ceF07aFedc45a8566d1aDd3168F3',
      // test web3 account private key
      '0x6e578c2227bc4629794e566610209c9cb7a35341f13de4ba886a59a4e11b7d1e',
      // Receiver web3 account
      '0xCe1812Ccc5273a3F8B1b2d96217877842a851A31',
      // Value
      0.01,
      // Here we can pass a edit gasPrice or not using Low, High or empty to standard
      ''
    );

    const blockNumber = transaction.blockNumber;
    expect(typeof blockNumber).toBe('number');
  });
});
