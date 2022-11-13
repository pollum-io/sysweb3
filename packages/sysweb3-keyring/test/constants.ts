import * as dotenv from 'dotenv';
dotenv.config();
export const FAKE_PASSWORD = 'Asdqwe123!';
export const FAKE_INVALID_PASSWORD = '12345';
export const SYS_EVM_NETWORK = {
  chainId: 57,
  currency: 'sys',
  default: true,
  label: 'Syscoin Mainnet',
  url: 'https://rpc.syscoin.org',
  apiUrl: 'https://explorer.syscoin.org/api',
  explorer: 'https://explorer.syscoin.org/',
};
export const FAKE_SEED_PHRASE = process.env.SEED_PEACE_GLOBE;
export const INVALID_SEED_PHRASE =
  'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor';
export const FAKE_ADDRESS = '0x4d4DB937177Ceb77aF4541b4EC9Ae8b0EA5d1a64';
export const FAKE_PRIV_KEY =
  '0x27cf026f5657ad3403b767f16e0c46eeaa03fe0ff1903ad5a84d448263255a2b';
export const TX = {
  blockHash:
    '0x59a89d806619d401a5a918209352b21064dc648a814ca1d18ba64ab761d59380',
  blockNumber: 193969,
  from: '0x1FEdCaf5b29259a24C79D3Dfec099b4766AD9ca4',
  gas: 21000,
  maxFeePerGas: '1500000014',
  hash: '0xdc0893d96912c44c32fbff5c5a952b30618611f6a4fa1509f1784ac198b70244',
  input: '0x',
  nonce: 14282,
  to: '0xa619A89dD98A3627ed51330a413Fa94A9ef930f3',
  transactionIndex: 6,
  value: '10000000000000000',
  type: 2,
  accessList: [],
  chainId: 57,
  v: '0x1',
  r: '0xe48cd40bae42146f44d4d8caab1edd2f19ec5a136db3f4e3f6678441afa23b3',
  s: '0x739de80ac6b7c4c478b0669faa44282848445e16c110271de4ec0501bfeaabb7',
};
