import web3Provider from '../provider/web3Provider';

export const sysGetBalance = async (walletAddress: string) => {
  try {
    await web3Provider.eth
      .getBalance(walletAddress)
      .then((balance) => console.log(balance));
  } catch (error) {
    console.log(`${error}`);
  }
};

console.log(sysGetBalance('0x8B06aFc57FdC8C33834A0bcf81a5326f8d46e8E5'));
