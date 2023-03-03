import { Web3Accounts } from '../src/eth-manager';
import {
  FAKE_PRIVATE_KEY_ACCOUNT_ADDRESS,
  POLYGON_MUMBAI_NETWORK,
} from './constants';

describe('Test EVM transactions', () => {
  const { getUserTransactions } = Web3Accounts();

  jest.setTimeout(50000); // 20s

  it('Should get transactions from accounts', async () => {
    const transactions = await getUserTransactions(
      FAKE_PRIVATE_KEY_ACCOUNT_ADDRESS as string,
      POLYGON_MUMBAI_NETWORK
    );

    expect(transactions).toBeDefined();
  });
});
