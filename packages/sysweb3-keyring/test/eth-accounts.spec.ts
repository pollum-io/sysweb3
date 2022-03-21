import { Web3Accounts } from '../src/accounts/eth-accounts';

const { createAccount } = Web3Accounts();

describe('Web3Accounts', () => {
  it('should create an account', () => {
    const newAccount = createAccount();

    expect(newAccount).toBeTruthy();
    expect(newAccount.address).toBeTruthy();
  });
});
