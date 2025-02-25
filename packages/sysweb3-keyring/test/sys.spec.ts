import {
  CREATE_TOKEN_PARAMS,
  DATA,
  FAKE_PASSWORD,
  PEACE_SEED_PHRASE,
  SYS_TANENBAUM_UTXO_NETWORK,
} from './constants';
import { KeyringManager } from '../src/keyring-manager';
import { KeyringAccountType } from '../src/types';

const sjs = require('syscoinjs-lib');

describe('testing functions for the new-sys txs', () => {
  const keyringManager = new KeyringManager();
  let address;
  const sysJS = new sjs.SyscoinJSLib(
    null,
    `https://blockbook-dev.elint.services`,
    sjs.utils.syscoinNetworks.testnet
  );
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

  //* setWalletPassword / lock / unlock
  it('should set password, lock and unlock with the proper password', async () => {
    keyringManager.setWalletPassword(FAKE_PASSWORD);
    keyringManager.lockWallet();
    const wrong = await keyringManager.unlock('wrongp@ss123');
    const right = await keyringManager.unlock(FAKE_PASSWORD);
    expect(right).toBe(true);
    expect(wrong).toBe(false);
  });

  //* createKeyringVault
  it('should create the keyring vault', async () => {
    const account = await keyringManager.createKeyringVault();

    address = account.address;
    expect(account).toBeDefined();
  });

  //--------------------------------------------------------SyscoinTransactions Tests----------------------------------------------------

  it('should generate signPSBT json', async () => {
    await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK as any,
      'syscoin'
    );
    const res = await keyringManager.syscoinTransaction.signTransaction(
      DATA['sign'],
      true
    );

    expect(res).toBeDefined();
  }, 180000);

  it('should sign and send tx', async () => {
    await keyringManager.setSignerNetwork(
      SYS_TANENBAUM_UTXO_NETWORK as any,
      'syscoin'
    );
    const feeRate = new sjs.utils.BN(10);
    const txOpts = { rbf: false };
    // if SYS need change sent, set this address. null to let HDSigner find a new address for you
    const sysChangeAddress = await keyringManager.getNewChangeAddress();
    const outputsArr = [
      {
        address: 'tsys1qdsvzmrxkq5uh0kwc6cyndsj7fluszcu3pl2wlv',
        value: new sjs.utils.BN(1 * 1e8),
      },
    ];
    const fromXpubOrAddress =
      'vpub5YBbnk2FsQPCd4LsK7rESWaGVeWtq7nr3SgrdbeaQgctXBwpFQfLbKdwtDAkxLwhKubbpNwQqKPodfKTwVc4uN8jbsknuPTpJuW8aN1S3nC';
    const response = await sysJS.createTransaction(
      txOpts,
      sysChangeAddress,
      outputsArr,
      feeRate,
      fromXpubOrAddress
    );
    const data = {
      psbt: response.psbt.toBase64(),
      assets: JSON.stringify([...response.assets]),
    };
    const res = await keyringManager.syscoinTransaction.signTransaction(
      data,
      false
    );

    expect(res).toBeDefined();
  }, 180000);

  it('should get recommended fee', async () => {
    const { explorer } = SYS_TANENBAUM_UTXO_NETWORK;
    const fee = await keyringManager.syscoinTransaction.getRecommendedFee(
      explorer
    );

    expect(typeof fee).toBe('number');
  }, 90000);
});
