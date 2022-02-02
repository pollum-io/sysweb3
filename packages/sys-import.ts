import web3Provider from '../provider/web3Provider';

export const sysImportAccount = (privateKey: string) => web3Provider.eth.accounts.privateKeyToAccount(`${privateKey}`);