import { getBalance } from './web3-balance';
import { FAKE_ADDRESS } from '../test-constants/test-constants';

describe('Balance tests', () => {
  it('should get balance', async () => {
    const balance = await getBalance(FAKE_ADDRESS);
    expect(typeof balance).toBe('number');
  });
});
