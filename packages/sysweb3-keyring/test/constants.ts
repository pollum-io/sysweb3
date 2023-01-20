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

export const SYS_MAINNET_UTXO_NETWORK = {
  chainId: 57,
  label: 'Syscoin Mainnet',
  url: 'https://blockbook.elint.services/',
  default: true,
  currency: 'sys',
};

export const SYS_TESTNET_UTXO_ADDRESS =
  'tsys1q4v8sagt0znwaxdscrzhvu8t33n7vj8j45czpv4';

export const DATA: { [type: string]: any } = {
  send: {
    amount: 1,
    fee: 0.00001,
    token: null,
    isToken: false,
    rbf: true,
  },
  transferOwnership: {
    newOwner: SYS_TESTNET_UTXO_ADDRESS,
    fee: 0.00001,
  },
  createToken: {
    maxsupply: 1,
    precision: 8,
    receiver: '', // optional, if null it is set to connected account address,
    symbol: 'pali1', // max 8 characters
    initialSupply: 0, // optional
    description: 'pali demo dapp token create test 1', // optional
  },
  sign: {
    psbt: 'cHNidP8BANmCAAAAAXV1yEYFkSVeffIhpGoiJeEYWdwHtfutBmNrQq9Y3+yXAgAAAAD/////A6AJAQAAAAAAFgAUZMBLT7xge2bLcHuAmhtOdCUnv4kA4fUFAAAAAF9qTFwCg7Wg6XcBAAAAhsNAAQIJAAjBCGNHRnNhVEU9CTt7ImRlc2MiOiJjR0ZzYVNCa1pXMXZJR1JoY0hBZ2RHOXJaVzRnWTNKbFlYUmxJSFJsYzNRZ01RPT0ifQB/APS5PDADAAAAFgAUtji2FZyTh0hQCpxBnA47GNrn9fQAAAAAAAEBH/R8NzYDAAAAFgAUTTxsbg+2G8pcJY7dAQcZx1QtYHEBCGsCRzBEAiB8cJut6NP2IOGiFgAD2/0YM2otMAgvYlY51VyEoYWl0gIgYHXg85w1sJsHXuklbBYFarSVeYAuxoCIeU39HkLiO+IBIQKDuln5k6NYVB+eI+UIS6GMvaICoPDxp892khDysiiybgdhZGRyZXNzLHRzeXMxcWY1N3hjbXMwa2NkdTVocDkzbXdzenBjZWNhMno2Y3IzcjNjamNzBHBhdGgSbS84NCcvMScvMCcvMS8xNjU0AAAAAA==',
    assets: '[]',
  },
  updateToken: {
    assetGuid: '1866384788',
    description: 'test pali 1',
    capabilityflags: 127,
    eventName: 'txUpdateToken',
    fee: 0.00001,
  },
  mintToken: {
    amount: 1,
    assetGuid: '2766796510', // BEFORE EACH TEST, THIS ASSET GUID NEED TO BE CHANGED FOR ANOTHER ASSETGUID AVAILABLE IN PEACE_GLOBE WALLET.
    capabilityflags: 127,
    fee: 0.00001,
  },
  createNft: {
    symbol: 'nft',
    issuer: 'tsys1qmwaxw8mg5jky38ef96esy2aq2dqm8qz8yd93yz',
    precision: 1,
    description:
      'https://ipfs.io/ipfs/bafkreicex4ik5ik7xymhd3aaqyr5pm4drdifjqjg646guhevykcfzr4ega',
    capabilityflags: 127,
    eventName: 'txCreateNFT',
    fee: 0.00001,
  },
};

export const CREATE_TOKEN_PARAMS = {
  precision: 8,
  symbol: 'paliToken',
  maxsupply: 1800000,
  description: 'desc',
  initialSupply: 150,
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
