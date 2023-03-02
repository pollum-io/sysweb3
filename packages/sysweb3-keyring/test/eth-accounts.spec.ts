import { Web3Accounts } from '../src/eth-manager';
import { FAKE_ADDRESS, FAKE_PRIV_KEY, PEACE_SEED_PHRASE } from './constants';

describe('Web3Accounts', () => {
  const { getBalance, importAccount } = Web3Accounts();

  it('should import an account using a private key', async () => {
    const importedAccount = importAccount(FAKE_PRIV_KEY);

    expect(importedAccount).toBeTruthy();
    expect(importedAccount.address).toEqual(FAKE_ADDRESS);
  });

  //* importAccount
  it('should import an account using a seed phrase (mnemonic)', async () => {
    const importedAccount = importAccount(PEACE_SEED_PHRASE as string);

    expect(importedAccount).toBeTruthy();
    expect(importedAccount.address).toBeTruthy();
  });

  //* getBalance
  it('should get an account balance', async () => {
    const balance = await getBalance(FAKE_ADDRESS);
    expect(typeof balance).toBe('number');
  });

  // //* getNftsByAddress
  // it('should get all NFTs from an account', async () => {
  //   const userNFT = await getNftsByAddress(
  //     '0xa3d42513a1affe8d0862cf51df6145523837393a'
  //   );
  //   expect(userNFT).not.toBeNull();
  //   const blockNumber = userNFT[0].blockNumber;
  //   expect(blockNumber.length).toBeGreaterThan(0);
  // });

  //* getTokens
  // it('should get the tokens from an account', async () => {
  //   const tokens = await getTokens(
  //     '0xa3d42513a1affe8d0862cf51df6145523837393a'
  //   );
  //   expect(tokens).not.toBeNull();
  //   if (tokens.length > 0) {
  //     const firstTokenValue = tokens[0].value;
  //     expect(typeof firstTokenValue).toBe('number');
  //   }
  // });

  // //* setActiveNetwork
  // it('should change the network', () => {
  //   // 5700 = testnet chainId
  //   setActiveNetwork(networks.syscoin[5700]);

  //   const provider = web3Provider.currentProvider;
  //   const { HttpProvider } = Web3.providers;

  //   expect(provider).toBeInstanceOf(HttpProvider);
  //   if (!(provider instanceof HttpProvider)) return;

  //   expect(provider.host).toBe('https://blockbook-dev.elint.services/');
  // });

  // jest.setTimeout(15000);

  /* //* sendTransaction
  it('should send a transaction', async () => {
    // change to Rinkeby network
    setActiveNetwork(networks.ethereum[4]);
    const transaction = await sendTransaction({
      sender: '0x0beaDdE9e116ceF07aFedc45a8566d1aDd3168F3',
      senderXprv:
        '0x6e578c2227bc4629794e566610209c9cb7a35341f13de4ba886a59a4e11b7d1e',
      receivingAddress: '0xCe1812Ccc5273a3F8B1b2d96217877842a851A31',
      amount: 0.01,
    });

    const blockNumber = transaction.blockNumber;
    expect(typeof blockNumber).toBe('number');
  }); */
});
