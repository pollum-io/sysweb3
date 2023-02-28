import { KeyringManager } from '../src/keyring-manager';
import { EthereumTransactions } from '../src/transactions/ethereum';
import {
  FAKE_PASSWORD,
  FAKE_PRIVATE_KEY,
  FAKE_PRIVATE_KEY_ACCOUNT_ADDRESS,
  FAKE_SEED_ACCOUNT_ADDRESS,
  HEALTH_SEED_PHRASE,
  POLYGON_MUMBAI_NETWORK,
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
    const right = keyringManager.validateSeed(HEALTH_SEED_PHRASE as string);

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

  it('should import a account by private key and validate it', async () => {
    keyringManager.setSignerNetwork(
      POLYGON_MUMBAI_NETWORK as INetwork,
      'ethereum'
    );

    const network = keyringManager.getNetwork();

    const createAccount = await keyringManager.handleImportAccountByPrivateKey(
      FAKE_PRIVATE_KEY as string,
      'CONTA NOVA'
    );

    //VALIDATE CURRENT NETWORK
    expect(network).toEqual(POLYGON_MUMBAI_NETWORK);

    //VALIDATIONS FOR NEW ACCOUNT VALUES
    expect(createAccount).toBeDefined();
    expect(typeof createAccount === 'object').toBe(true);
    expect(typeof createAccount.address === 'string').toBe(true);
    expect(createAccount.address).toEqual(FAKE_PRIVATE_KEY_ACCOUNT_ADDRESS);
  });

  it('Should run getLatestUpadateForAccount, keep and validate both accounts values correctly', async () => {
    const latestUpdate = await keyringManager.getLatestUpdateForAccount();

    const getCurrentState = keyringManager.getState();

    //VALIDATIONS TO COMPARE THE VALUES RECEIVED BY getLatestUpdateForAccount
    expect(latestUpdate.accountLatestUpdate.address).toEqual(
      FAKE_PRIVATE_KEY_ACCOUNT_ADDRESS
    );
    expect(latestUpdate.accountLatestUpdate.id).toEqual(1);
    expect(Object.keys(latestUpdate.walleAccountstLatestUpdate).length).toEqual(
      2
    );
    //VALIDATIONS FOR CURRENT STATE AFTER IMPORT NEW ACCOUNT AND RUN getLatestUpdateForAccount
    expect(getCurrentState.accounts[0].address).toEqual(
      FAKE_SEED_ACCOUNT_ADDRESS
    );
  });

  it('Should send and validate txSend for new account', async () => {
    const tx = TX;
    const { maxFeePerGas, maxPriorityFeePerGas } =
      await ethereumTransactions.getFeeDataWithDynamicMaxPriorityFeePerGas();
    tx.maxFeePerGas = maxFeePerGas;
    tx.maxPriorityFeePerGas = maxPriorityFeePerGas;
    const curState = keyringManager.getState();

    const { activeAccount } = curState;
    tx.to = curState.accounts[0].address;
    tx.from = curState.accounts[activeAccount].address; // SHOULD BE IMPORTED ACCOUNT BY PRIVATE KEY ADDRESS
    tx.nonce = await ethereumTransactions.getRecommendedNonce(
      curState.accounts[activeAccount].address
    );
    tx.chainId = curState.activeNetwork.chainId;
    tx.gasLimit = await ethereumTransactions.getTxGasLimit(tx);
    const resp = await ethereumTransactions.sendFormattedTransaction(tx);
    console.log('CURRENT STATE', curState);

    console.log('TX AT ALL', {
      ...tx.to,
      ...tx.from,
      ...resp,
    });

    expect(resp.hash).toBeDefined();
  });
});
