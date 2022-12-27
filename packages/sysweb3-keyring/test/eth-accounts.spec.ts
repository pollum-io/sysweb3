// import Web3 from 'web3';

import { Web3Accounts } from '../src/eth-manager';
import { initialNetworksState } from '../src/initial-state';
import { KeyringManager } from '../src/keyring-manager';
import { FAKE_PASSWORD } from './constants';
import { getDecryptedVault } from '@pollum-io/sysweb3-utils';

describe('Web3Accounts', () => {
  const web3 = Web3Accounts();

  const keyring = KeyringManager();

  beforeEach(async () => {
    // * set password before creating a new seed phrase
    keyring.setWalletPassword(FAKE_PASSWORD);

    // * create a new seed phrase
    keyring.createSeed();

    // * after setting the password and the seed, create a new wallet
    await keyring.createKeyringVault();

    await keyring.setSignerNetwork(
      initialNetworksState.ethereum[137],
      'ethereum'
    );
  });

  //* getBalance
  it('should get balance for the provided address', async () => {
    const {
      wallet: { activeAccount },
    } = getDecryptedVault();

    const balance = await web3.getBalance(activeAccount.address);

    expect(balance).toStrictEqual(0);
  });
});
