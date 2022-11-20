import { ethers } from 'ethers';

import { initialWalletState } from '../src/initial-state';
import { KeyringManager } from '../src/keyring-manager';
import { EthereumTransactions } from '../src/transactions/ethereum';
import {
  FAKE_PASSWORD,
  FAKE_SEED_PHRASE,
  SYS_EVM_NETWORK,
  FAKE_ADDRESS,
  TX,
} from './constants';
import { INetwork } from '@pollum-io/sysweb3-utils';
describe('', () => {
  const keyringManager = KeyringManager();
  const ethereumTransactions = EthereumTransactions();

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
  it('should get an updated account', async () => {
    const account = await keyringManager.getLatestUpdateForAccount();

    expect(account).toBeDefined();
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

  it('should validate getFeeDataWithDynamicMaxPriorityFeePerGas method', async () => {
    const feeDataWithDynamicMaxPriorityFeePerGas =
      await ethereumTransactions.getFeeDataWithDynamicMaxPriorityFeePerGas();

    expect(feeDataWithDynamicMaxPriorityFeePerGas).toBeDefined();
  });

  it('should validate getTxGasLimit method', async () => {
    const tx = TX;
    tx.value = ethereumTransactions.toBigNumber(tx.value);
    const gasLimit = await ethereumTransactions.getTxGasLimit(tx);
    expect(gasLimit instanceof ethers.BigNumber).toBeTruthy();
  });

  //* setSignerNetwork
  it('should set the network', async () => {
    const testnet = initialWalletState.networks.ethereum[5700];
    await keyringManager.setSignerNetwork(testnet, 'ethereum');

    const network = keyringManager.getNetwork();
    expect(network).toEqual(testnet);
  });
  it('Should validate txSend', async () => {
    const tx = TX;
    const { maxFeePerGas, maxPriorityFeePerGas } =
      await ethereumTransactions.getFeeDataWithDynamicMaxPriorityFeePerGas();
    tx.maxFeePerGas = maxFeePerGas;
    tx.maxPriorityFeePerGas = maxPriorityFeePerGas;
    const curState = await keyringManager.getState();
    tx.from = curState.activeAccount.address;
    console.log('Checking current state', curState);
    tx.nonce = await ethereumTransactions.getRecommendedNonce(
      curState.activeAccount.address
    );
    tx.chainId = curState.activeNetwork.chainId;
    tx.gasLimit = await ethereumTransactions.getTxGasLimit(tx);
    const resp = await ethereumTransactions.sendFormattedTransaction(tx);
    expect(resp.hash).toBeDefined();
  });

  it('Should emulate eth_sign ', async () => {
    const resp = ethereumTransactions.ethSign([
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      '0x879a053d4800c6354e76c7985a865d2922c82fb5b3f4577b2fe08b998954f2e0',
    ]);
    expect(resp).toBe(
      '0x9f2f4ce0b6dedd5f66aa83caae39b90aaf29ebc18c588610d27301dbd3b2aa2935ba8758757c531e851c92c2f103375906139c77d3fc3f3d3fba81a0063f01631c'
    );
  });
  it('Should emulate personal_sign ', async () => {
    const resp = ethereumTransactions.signPersonalMessage([
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      '0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765',
      'Example password',
    ]);
    expect(resp).toBe(
      '0x1e4c47c96d285648db99bf2bdf691aae354d2beb80ceeeaaffa643d37900bf510ea0f5cd06518fcfc67e607898308de1497b6036ccd343ab17e3f59eb87567e41c'
    );
  });
  it('Should parse Hex encoded message', async () => {
    const resp = ethereumTransactions.parsePersonalMessage(
      '0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765'
    );
    expect(resp).toBe('Example `personal_sign` message');
  });
  it('GetEncryptedKey', async () => {
    const resp = ethereumTransactions.getEncryptedPubKey();
    console.log('resp', resp);
    expect(resp).toBe('mg0LYtIw5fefbmqlu6sZ9pJtddfM/6/EEPW56qYwwRU=');
  });

  it('Should emulate eth_signTypedData ', async () => {
    const typedData = {
      data: [
        { type: 'string', name: 'Message', value: 'Hi, Alice!' },
        { type: 'uint32', name: 'A number', value: '1337' },
      ],
    };
    const resp = ethereumTransactions.signTypedData(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      typedData,
      'V1'
    );
    expect(resp).toBe(
      '0x6fd4f93623d151b487656cd3a0aaaec16aee409c353bad7c1f8eecbbab07b06f51ac8be73d7a2d4bba579505aff7c5a62f91141fee75ff2cbb0c111dcfe589c01b'
    );
  });

  it('should set the network', async () => {
    const mainnet = initialWalletState.networks.ethereum[57];
    await keyringManager.setSignerNetwork(mainnet, 'ethereum');

    const network = keyringManager.getNetwork();
    expect(network).toEqual(mainnet);
  });

  it('Should emulate eth_signTypedDataV3', async () => {
    const typedData = {
      data: JSON.parse(
        '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"wallet","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person"},{"name":"contents","type":"string"}]},"primaryType":"Mail","domain":{"name":"Ether Mail","version":"1","chainId":57,"verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"},"message":{"from":{"name":"Cow","wallet":"0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"},"to":{"name":"Bob","wallet":"0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"},"contents":"Hello, Bob!"}}'
      ),
    };
    console.log('Typed Data', typedData.data);
    const resp = ethereumTransactions.signTypedData(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      typedData,
      'V3'
    );
    expect(resp).toBe(
      '0xe49406911c08d5c8746636c2edaed9fd923b2d2d5659686352a9a4c897b847d36fc4283c62f387bd306e2fb4d241392c1f2ed519586fa532c31b1c2b0c1f85e11b'
    );
  });

  it('Should emulate eth_signTypedDataV4', async () => {
    const typedData = {
      data: JSON.parse(
        '{"domain":{"chainId":"57","name":"Ether Mail","verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC","version":"1"},"message":{"contents":"Hello, Bob!","from":{"name":"Cow","wallets":["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826","0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF"]},"to":[{"name":"Bob","wallets":["0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB","0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57","0xB0B0b0b0b0b0B000000000000000000000000000"]}]},"primaryType":"Mail","types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Group":[{"name":"name","type":"string"},{"name":"members","type":"Person[]"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person[]"},{"name":"contents","type":"string"}],"Person":[{"name":"name","type":"string"},{"name":"wallets","type":"address[]"}]}}'
      ),
    };
    console.log('Typed Data', typedData.data);
    const resp = ethereumTransactions.signTypedData(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      typedData,
      'V4'
    );
    expect(resp).toBe(
      '0x3b891678723c3ded564278630ec47ea9d8c1b9f61fba1d00cebbe66a0d6209da45d4cd2c74c3c64526471d4da82d6b3b4c053036cee73efb9a78b49edf621ef51b'
    );
  });
  //-----------------------------------------------------------------------------------------------EthereumTransaction Tests----------------------------------------------------

  //* forgetMainWallet
  it('should forget wallet / reset to initial state', async () => {
    keyringManager.forgetMainWallet(FAKE_PASSWORD);

    const wallet = keyringManager.getState();
    expect(wallet).toEqual(initialWalletState);
  });
});
