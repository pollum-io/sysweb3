import { web3Provider } from '../provider/web3Provider';

export const sysCreateAccount = () => web3Provider().eth.accounts.create();
