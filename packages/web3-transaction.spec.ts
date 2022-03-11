import { sendTransactions } from './web3-transactions';
import { changeNetwork } from '../provider/web3Provider';

describe('web3-transactions test', () => {
  jest.setTimeout(15000);

  it('should send a transaction', async () => {
    // change to Rinkeby network
    changeNetwork(4);
    const transaction = await sendTransactions(
      // test web3 account
      '0x6e578c2227bc4629794e566610209c9cb7a35341f13de4ba886a59a4e11b7d1e',
      // Pali web3 account
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      0.01
    );

    const blockNumber = transaction.blockNumber;
    expect(typeof blockNumber).toBe('number');
  });
});
