import web3Provider from '../src/web3Provider';

interface IWeb3ImportAccount {
  address: string;
  privateKey: string;
  signTransaction: Function;
  sign: Function;
  encrypt: Function;
}

const sysImportAccount = (key: string) => {
  const {
    address,
    privateKey,
    signTransaction,
    sign,
    encrypt,
  }: IWeb3ImportAccount = web3Provider.eth.accounts.privateKeyToAccount(
    `${key}`
  );

  return { address, privateKey, signTransaction, sign, encrypt };
};

console.log(
  sysImportAccount(
    '0x8be8cdcf5a1b070d5ea7ed4e24d67424e3975ac45370cf015179274412f169ae'
  )
);

export default sysImportAccount;
