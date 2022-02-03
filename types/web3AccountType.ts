export interface IWeb3Account {
  address: string;
  privateKey: string;
  signTransaction: Function;
  sign: Function;
  encrypt: Function;
}
