export type INetwork = {
  chainId: number;
  url: string;
  default?: boolean;
  label: string;
  currency?: string;
  explorer?: string;
};

export enum INetworkType {
  Ethereum = 'ethereum',
  Syscoin = 'syscoin',
}
