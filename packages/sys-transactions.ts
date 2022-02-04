import web3Provider from '../provider/web3Provider';

export const sysGetTransactions = async (walletAddress: string) => {
    try {
      await web3Provider.eth
        .getTransactionCount(walletAddress)
        .then((transactions) => console.log(transactions));
    } catch (error) {
      console.log(`${error}`);
    }
  };
  
console.log(sysGetTransactions('0x8B06aFc57FdC8C33834A0bcf81a5326f8d46e8E5'));