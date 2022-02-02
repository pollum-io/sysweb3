import web3Provider from '../provider/web3Provider';
import { IWeb3Account } from '../types/web3AccountType';

const sysImportAccount = (key: string) => {
  const { address, privateKey, signTransaction, sign, encrypt }: IWeb3Account =
    web3Provider.eth.accounts.privateKeyToAccount(`${key}`);

  return { address, privateKey, signTransaction, sign, encrypt };
};

console.log(
  sysImportAccount(
    '0x8be8cdcf5a1b070d5ea7ed4e24d67424e3975ac45370cf015179274412f169ae'
  )
);

export default sysImportAccount;
