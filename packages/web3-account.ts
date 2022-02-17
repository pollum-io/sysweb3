import { web3Provider } from '../provider/web3Provider';

export const createAccount = () => web3Provider.eth.accounts.create();
