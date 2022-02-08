import { web3Provider } from '../provider/web3Provider';

export const sysSendTransactions = async (fromPrivateKey, toAddress, value) => {
  const signedTransaction = await web3Provider().eth.accounts.signTransaction(
    {
      to: toAddress,
      value: web3Provider().utils.toWei(value.toString(), 'ether'),
      gas: await web3Provider().eth.estimateGas({
        to: toAddress,
      }),
    },
    fromPrivateKey
  );

  try {
    return web3Provider()
      .eth.sendSignedTransaction(`${signedTransaction.rawTransaction}`)
      .on('sending', (payload) => console.log(payload))
      .on('confirmation', (confirmation) => console.log(confirmation))
      .on('error', (err) => console.log(err));
  } catch (error) {
    console.log(`${error}`);
  }
};
