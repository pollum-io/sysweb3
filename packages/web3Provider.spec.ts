import Web3 from 'web3';
import { web3Provider } from './web3Provider';
import { changeNetwork } from './web3ChangeNetwork';

describe('web3Provider', () => {

  //* changeNetwork
  it('should change the network', async () => {
    // 5700 = testnet chainId
    await changeNetwork(5700);

    const provider = web3Provider.currentProvider;
    const { HttpProvider } = Web3.providers;
    expect(provider).toBeInstanceOf(HttpProvider);

    if (!(provider instanceof HttpProvider)) return;
    expect(provider.host).toBe('https://rpc.tanenbaum.io/')
  });

});
