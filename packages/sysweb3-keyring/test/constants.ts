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
  explorer: 'https://explorer.syscoin.org/',
};

export const FAKE_SEED_PHRASE = process.env.SEED_PEACE_GLOBE;
export const SECOND_FAKE_SEED_PHRASE =
  'gauge gauge gauge gauge gauge gauge gauge gauge gauge gauge gauge gauge';
export const INVALID_SEED_PHRASE =
  'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor';
export const ADDRESS = '0xa3d42513a1affe8d0862cf51df6145523837393a';
export const FAKE_ADDRESS = '0x4d4DB937177Ceb77aF4541b4EC9Ae8b0EA5d1a64';
export const FAKE_PRIV_KEY =
  '0x27cf026f5657ad3403b767f16e0c46eeaa03fe0ff1903ad5a84d448263255a2b';
export const TX: any = {
  to: '0x4d4DB937177Ceb77aF4541b4EC9Ae8b0EA5d1a64',
  from: '0x4d4DB937177Ceb77aF4541b4EC9Ae8b0EA5d1a64',
  nonce: 0,
  value: '0x9a2241af62c0000',
  type: 2,
  chainId: 57,
};
