import {
  CREATE_TOKEN_PARAMS,
  DATA,
  FAKE_PASSWORD,
  FAKE_SEED_PHRASE,
  SYS_TANENBAUM_UTXO_NETWORK,
} from './constants';
import { KeyringManager } from '../src/keyring-manager';
import { SyscoinTransactions } from '../src/transactions/syscoin';

describe('testing functions for sys txs', () => {
  const keyringManager = KeyringManager();
  const {
    confirmTokenCreation,
    getRecommendedFee,
    confirmTokenMint,
    confirmNftCreation,
    confirmUpdateToken,
    transferAssetOwnership,
    sendTransaction,
    signTransaction,
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

  //--------------------------------------------------------SyscoinTransactions Tests----------------------------------------------------
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

    // This test only run individually.

    expect(typeof txid).toBe('string');
  }, 90000);

  it('should create NFT token', async () => {
    const { address } = await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );

    const tx = { ...DATA['createNft'], issuer: address };

    const { success } = confirmNftCreation(tx);

    expect(success).toBeTruthy();
  }, 90000);

  it('should send native token', async () => {
    const { address } = await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );
    const tx = { ...DATA['send'], receivingAddress: address, sender: address };
    const { txid } = await sendTransaction(tx);

    // This test only run individually.

    expect(txid).toBeDefined();
  }, 120000);

  it('should sign and send tx', async () => {
    await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );
    const res = await signTransaction(DATA['sign'], true, false);

    expect(res).toBeDefined();
  }, 90000);

  it('should confirm update token', async () => {
    const { address } = await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );
    const tx = { ...DATA['updateToken'], receiver: address };
    const { txid } = await confirmUpdateToken(tx);

    // If the asset isn't minted, the test will fail.

    expect(txid).toBeDefined();
  }, 90000);

  it('should confirm mint token', async () => {
    const { address, transactions, assets } =
      await keyringManager.setSignerNetwork(
        SYS_TANENBAUM_UTXO_NETWORK,
        'syscoin'
      );
    const filteredTxs = transactions?.filter(
      (tx: any) => tx.tokenType === 'SPTAssetActivate'
    );

    const allMintedTokens: any[] = [];

    for (const txs of filteredTxs) {
      for (const tokens of txs.tokenTransfers) {
        if (tokens) {
          allMintedTokens.push(tokens.token);
        }
      }
    }

    const notMintedTokens = assets.filter(
      (token: any) => !allMintedTokens.includes(token.assetGuid)
    );

    const randomIndex = Math.floor(
      Math.random() * (notMintedTokens.length - 1 - 0 + 1) + 0
    );

    const randomAssetguid = notMintedTokens[randomIndex].assetGuid;

    // If all assetGuids in wallet be used as param, the test will fail.

    const tx = {
      ...DATA['mintToken'],
      receivingAddress: address,
      assetGuid: randomAssetguid,
    };

    const { txid } = await confirmTokenMint(tx);

    expect(txid).toBeDefined();
  }, 90000);

  it('should transfer ownership to another address', async () => {
    const { transactions } = await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );
    const filteredTxs = transactions?.filter(
      (tx: any) => tx.tokenType === 'SPTAssetActivate'
    );

    const allMintedTokens: any[] = [];

    for (const txs of filteredTxs) {
      for (const tokens of txs.tokenTransfers) {
        if (tokens) {
          allMintedTokens.push(tokens);
        }
      }
    }

    const randomIndex = Math.floor(
      Math.random() * (allMintedTokens.length - 1 - 0 + 1) + 0
    );

    const randomAssetguid = allMintedTokens[randomIndex].token;

    const tx = { ...DATA['transferOwnership'], assetGuid: randomAssetguid };

    // If the asset has already been transferred, the test will fail.

    const { txid } = await transferAssetOwnership(tx);

    expect(txid).toBeDefined();
  }, 90000);

  it('should get recommended fee', async () => {
    const { explorer } = SYS_TANENBAUM_UTXO_NETWORK;
    const fee = await getRecommendedFee(explorer);

    expect(typeof fee).toBe('number');
  }, 90000);
});
