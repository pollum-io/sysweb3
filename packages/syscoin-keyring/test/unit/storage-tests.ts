import { expect } from 'chai';
import { KeyringManager, KeyringNetwork } from '../../src';
import { sysDi } from '@syscoin/syscoin-core';
import { Encryptor } from '../../src/encryptor';

const testData = require('../resources/test-data.json');

const phrase = "solution rookie cake shine hand attack claw awful harsh level case vocal";
const testExpect = {
  sysAddress: '',
  ethAddress: '0x65b1fd6244b7ba33a48338323af0ebbc39c1d640'
}

const keyringManager = new KeyringManager();
const encryptor = new Encryptor();

// The KeyringController is also an event emitter:
keyringManager.on('update', (state) => {
  console.log(`update`);
  console.log(JSON.stringify(state, null, 2));
})

keyringManager.setPassword('password');

describe('KeyringController', () => {

  it('setup-vault-hd-wallet', async () => {

    await keyringManager.createOrRestoreVault('', phrase, 'password');

    const [account1, account2] = keyringManager.getAccounts();

    expect(testExpect.sysAddress).to.equal(account1.getAddress());
    expect(testExpect.ethAddress).to.equal(account2.getAddress());

    const encryptedVault = sysDi.getStateStorageDb().get('vault');

    const vault = await encryptor.decrypt('password', encryptedVault)

    console.log(encryptedVault);
    console.log(JSON.stringify(vault, null, 2));

  });

  it('setup-single-account', async () => {

    const wallet = await keyringManager.createSingleAccountWallet('', KeyringNetwork.Ethereum, testData.PRIVATE_KEY);

    const account = wallet.getAccounts()[0];

    expect(testData.ETH_ADDRESS.toLowerCase()).to.equal(account.getAddress());

    const encryptedVault = sysDi.getStateStorageDb().get('vault');

    const vault = await encryptor.decrypt('password', encryptedVault)


    console.log(JSON.stringify(vault, null, 2));
    console.log(encryptedVault);

  });


});
