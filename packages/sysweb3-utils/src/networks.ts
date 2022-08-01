export enum INetworkType {
  Ethereum = 'ethereum',
  Syscoin = 'syscoin',
}

export type INetwork = {
  chainId: number;
  url: string;
  default?: boolean;
  label: string;
  key?: string;
  apiUrl?: string;
  currency?: string;
  explorer?: string;
};
