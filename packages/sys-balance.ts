import web3Provider from '../provider/web3Provider';

export const sysGetBalance = async (walletAddress) => {
  try {
    const balance = await web3Provider()
      .eth.getBalance(walletAddress)
      .then((b) => console.log(b));

    // return web3Provider().utils.toWei(balance, 'ether');
  } catch (error) {
    console.log(`${error}`);
  }
};

console.log(sysGetBalance('0x0beaDdE9e116ceF07aFedc45a8566d1aDd3168F3'));
