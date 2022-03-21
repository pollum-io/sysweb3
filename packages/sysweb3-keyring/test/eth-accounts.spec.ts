import { FAKE_ADDRESS } from '../../../test/constants';
import { Web3Accounts } from '../src/accounts/eth-accounts';

describe('Web3Accounts', () => {
  const { getBalance, createAccount } = Web3Accounts();

  it('should create an account', () => {
    const newAccount = createAccount();

    expect(newAccount).toBeTruthy();
    expect(newAccount.address).toBeTruthy();
  });

  it('should get balance', async () => {
    const balance = await getBalance(FAKE_ADDRESS);
    expect(typeof balance).toBe('number');
  });
});
