import { web3Provider } from "../provider/web3Provider";
import abi from '../utils/erc20.json'

const getTokens = async () => {
    const tokenAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const myWalletAddress = '0x7BFCe3CFE987Ca195404A57cdaF2210c2d131998';

    const contract = new web3Provider.eth.Contract(abi, tokenAddress);
    const tokenBalance = await contract.methods.balanceOf(myWalletAddress).call();

    return tokenBalance;
}


console.log(getTokens())

