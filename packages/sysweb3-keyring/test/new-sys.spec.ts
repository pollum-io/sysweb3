import { NewKeyringManager } from '../src/new-keyring-manager';
import { KeyringAccountType } from '../src/types';
import {
  CREATE_TOKEN_PARAMS,
  DATA,
  FAKE_PASSWORD,
  PEACE_SEED_PHRASE,
  SYS_TANENBAUM_UTXO_NETWORK,
} from './constants';

describe('testing functions for the new-sys txs', () => {
  const keyringManager = new NewKeyringManager();
  let address, transactions, assets;
  //TODO: remove intialisation test and substitue for globalSetup
  // beforeAll(async () => {
  //   console.log('Before ALL');
  //   const newSeed = keyringManager.setSeed(String(PEACE_SEED_PHRASE));
  //   console.log('NewSeed', newSeed);
  //   expect(newSeed).toBe(String(PEACE_SEED_PHRASE));
  //   const right = keyringManager.checkPassword(FAKE_PASSWORD);
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
    transactions = account.transactions;
    assets = account.assets;
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
    const wallet = keyringManager.getState();
    expect(wallet.activeAccountId).toBe(1);
    console.log('Check wallet state', wallet);
    await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK,
      'syscoin'
    );

    const { txid } =
      await keyringManager.syscoinTransaction.confirmTokenCreation({
        ...CREATE_TOKEN_PARAMS,
        receiver: address,
      });

    // This test only run individually.

    expect(typeof txid).toBe('string');
  }, 180000);

  // it('should create NFT token', async () => {
  //   await keyringManager.setSignerNetwork(
  //     SYS_TANENBAUM_UTXO_NETWORK,
  //     'syscoin'
  //   );

  //   const tx = { ...DATA['createNft'], issuer: address };

  //   const { success } =
  //     keyringManager.syscoinTransaction.confirmNftCreation(tx);

  //   expect(success).toBeTruthy();
  // }, 180000);

  // it('should send native token', async () => {
  //   await keyringManager.setSignerNetwork(
  //     SYS_TANENBAUM_UTXO_NETWORK,
  //     'syscoin'
  //   );

  //   const tx = { ...DATA['send'], receivingAddress: address, sender: address };
  //   const { txid } = await keyringManager.syscoinTransaction.sendTransaction(
  //     tx
  //   );

  //   // This test only run individually.

  //   expect(txid).toBeDefined();
  // }, 180000);

  // it('should generate signPSBT json', async () => {
  //   await keyringManager.setSignerNetwork(
  //     SYS_TANENBAUM_UTXO_NETWORK,
  //     'syscoin'
  //   );
  //   const res = await keyringManager.syscoinTransaction.signTransaction(
  //     DATA['sign'],
  //     true,
  //     false
  //   );

  //   expect(res).toBeDefined();
  // }, 180000);

  // it('should sign and send tx', async () => {
  //   await keyringManager.setSignerNetwork(
  //     SYS_TANENBAUM_UTXO_NETWORK,
  //     'syscoin'
  //   );
  //   const res = await keyringManager.syscoinTransaction.signTransaction(
  //     DATA['signAndSend'],
  //     false
  //   );

  //   expect(res).toBeDefined();
  // }, 180000);

  // it('should confirm update token', async () => {
  //   await keyringManager.setSignerNetwork(
  //     SYS_TANENBAUM_UTXO_NETWORK,
  //     'syscoin'
  //   );

  //   const tx = { ...DATA['updateToken'], receiver: address };
  //   const { txid } = await keyringManager.syscoinTransaction.confirmUpdateToken(
  //     tx
  //   );

  //   // If the asset isn't minted, the test will fail.

  //   expect(txid).toBeDefined();
  // }, 180000);

  // it('should confirm mint token', async () => {
  //   await keyringManager.setSignerNetwork(
  //     SYS_TANENBAUM_UTXO_NETWORK,
  //     'syscoin'
  //   );

  //   const filteredTxs = transactions?.filter(
  //     (tx: any) => tx.tokenType === 'SPTAssetActivate'
  //   );

  //   const allMintedTokens: any[] = [];

  //   for (const txs of filteredTxs) {
  //     for (const tokens of txs.tokenTransfers) {
  //       if (tokens) {
  //         allMintedTokens.push(tokens.token);
  //       }
  //     }
  //   }

  //   const notMintedTokens = assets.filter(
  //     (token: any) => !allMintedTokens.includes(token.assetGuid)
  //   );

  //   const randomIndex = Math.floor(
  //     Math.random() * (notMintedTokens.length - 1 - 0 + 1) + 0
  //   );

  //   const randomAssetguid = notMintedTokens[randomIndex].assetGuid;

  //   // If all assetGuids in wallet be used as param, the test will fail.

  //   const tx = {
  //     ...DATA['mintToken'],
  //     receivingAddress: address,
  //     assetGuid: randomAssetguid,
  //   };

  //   const { txid } = await keyringManager.syscoinTransaction.confirmTokenMint(
  //     tx
  //   );

  //   expect(txid).toBeDefined();
  // }, 180000);

  // it('should transfer ownership to another address', async () => {
  //   await keyringManager.setSignerNetwork(
  //     SYS_TANENBAUM_UTXO_NETWORK,
  //     'syscoin'
  //   );

  //   const filteredTxs = transactions?.filter(
  //     (tx: any) => tx.tokenType === 'SPTAssetActivate'
  //   );

  //   const allMintedTokens: any[] = [];

  //   for (const txs of filteredTxs) {
  //     for (const tokens of txs.tokenTransfers) {
  //       if (tokens) {
  //         allMintedTokens.push(tokens);
  //       }
  //     }
  //   }

  //   const randomIndex = Math.floor(
  //     Math.random() * (allMintedTokens.length - 1 - 0 + 1) + 0
  //   );

  //   console.log(randomIndex, allMintedTokens);
  //   const randomAssetguid = allMintedTokens[randomIndex].token;

  //   const tx = { ...DATA['transferOwnership'], assetGuid: randomAssetguid };

  //   // If the asset has already been transferred, the test will fail.

  //   const { txid } =
  //     await keyringManager.syscoinTransaction.transferAssetOwnership(tx);

  //   expect(txid).toBeDefined();
  // }, 180000);

  it('should get recommended fee', async () => {
    const { explorer } = SYS_TANENBAUM_UTXO_NETWORK;
    const fee = await keyringManager.syscoinTransaction.getRecommendedFee(
      explorer
    );

    expect(typeof fee).toBe('number');
  }, 90000);
});
