import { createAccount } from "./web3-account";

describe('web3-account', () => {
  it('should create an account', () => {
    const newAccount = createAccount();

    expect(newAccount).toBeTruthy();
    expect(newAccount.address).toBeTruthy();
  });
});
