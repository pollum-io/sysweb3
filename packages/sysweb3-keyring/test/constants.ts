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
export const SYS_TANENBAUM_UTXO_NETWORK = {
  chainId: 5700,
  label: 'Syscoin Testnet',
  url: 'https://blockbook-dev.elint.services/',
  default: true,
  currency: 'tsys',
  apiUrl: '',
  explorer: '',
};

export const DATA: { [type: string]: any } = {
  send: {
    sender: '',
    amount: 0.00001,
    receivingAddress: 'sys1qukdepxwlct2ekce4sak6z4ez93xq7huvve3feg',
    isToken: false,
    rbf: true,
    token: '', // token guid
  },
  createToken: {
    maxsupply: 1,
    precision: 8,
    receiver: '', // optional, if null it is set to connected account address,
    symbol: 'pali1', // max 8 characters
    initialSupply: 0, // optional
    description: 'pali demo dapp token create test 1', // optional
  },
  updateToken: {
    assetGuid: '2028120594',
    assetWhiteList: '', // optional
    capabilityflags: '127',
    contract: '', // optional
    description: 'pali demo dapp token update test 1', // optional
  },
  mintToken: {
    amount: 1,
    assetGuid: '2028120594',
    fee: 0.00001,
  },
  createNft: {
    description: 'pali demo dapp nft creation test 1',
    precision: 8,
    receivingAddress: '',
    symbol: 'nft1',
  },
  mintNft: {
    amount: 1,
    assetGuid: '897866765',
    fee: 0.00001,
  },
};

export const CREATE_TOKEN_PARAMS = {
  precision: 8,
  symbol: 'testTok',
  maxsupply: 18,
  description: 'desc',
  initialSupply: 15,
  capabilityflags: 127,
  eventName: 'txCreateToken',
  fee: 0.00001,
};
export const FAKE_SEED_PHRASE = process.env.SEED_PEACE_GLOBE;
export const SECOND_FAKE_SEED_PHRASE =
  'gauge gauge gauge gauge gauge gauge gauge gauge gauge gauge gauge gauge';
export const INVALID_SEED_PHRASE =
  'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor';
export const FAKE_ADDRESS = '0x4d4DB937177Ceb77aF4541b4EC9Ae8b0EA5d1a64';
export const FAKE_PRIV_KEY =
  '0x27cf026f5657ad3403b767f16e0c46eeaa03fe0ff1903ad5a84d448263255a2b';
export const TX: any = {
  to: '0xaaf791cc2cb91527c4aa2ac52c8af97150685840',
  from: '0x1FEdCaf5b29259a24C79D3Dfec099b4766AD9ca4',
  nonce: 0,
  value: '0x9a2241af62c0000',
  type: 2,
  chainId: 57,
  // v: '0x1',
  // r: '0xe48cd40bae42146f44d4d8caab1edd2f19ec5a136db3f4e3f6678441afa23b3',
  // s: '0x739de80ac6b7c4c478b0669faa44282848445e16c110271de4ec0501bfeaabb7',
};
