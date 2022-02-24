import { web3Provider } from '../provider/web3Provider';

/**
 * This function should send a value to address provided.
 * 
 * @param fromPrivateKey
 * @param toAddress
 * @param value
 * 
 * Use example: 
 * 
 * ```<button onClick={sendTransaction('0x00000000000000000000089000000000000000', '0x00000000000000000000089000000000000', 0.5)}>Get User Available NFTs in account</button>```
 * 
 * Example of object return (in console):
 * 
 * ```
 *      {
          blockHash: '0x00000000000000000000089000000000000',
          blockNumber: 10225756,
          contractAddress: null,
          cumulativeGasUsed: 13888023,
          effectiveGasPrice: 1063189439,
          from: '0x000000000000000000000000000000000',
          gasUsed: 21000,
          logs: [],
          logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
          status: true,
          to: '0x000000000000000000000000000000000',
          transactionHash: '0x0000000000000000000000000000000000000',
          transactionIndex: 61,
          type: '0x0'
        }
```
 *
 */

export const sendTransactions = async (
  fromPrivateKey,
  toAddress,
  value
) => {
  const signedTransaction = await web3Provider.eth.accounts.signTransaction(
    {
      to: toAddress,
      value: web3Provider.utils.toWei(value.toString(), 'ether'),
      gas: await web3Provider.eth.estimateGas({
        to: toAddress,
      }),
    },
    fromPrivateKey
  );

  try {
    return web3Provider.eth
      .sendSignedTransaction(`${signedTransaction.rawTransaction}`)
      .then((r) => console.log(r));
  } catch (error) {
    console.log(`${error}`);
  }
};