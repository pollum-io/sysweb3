export enum INetworkType {
  Ethereum = 'ethereum',
  Syscoin = 'syscoin',
}

export type INetwork = {
  chainId: number;
  url: string;
  isTestnet?: boolean;
  default?: boolean;
  label: string;
  currency?: string;
};
