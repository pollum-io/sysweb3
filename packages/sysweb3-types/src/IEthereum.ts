export interface IEthereum {
  ethereum: IEthereumAddress;
}

export interface IEthereumAddress {
  address: IEthereumBalance[];
}

export interface IEthereumBalance {
  balances: IEthereumCurrency[];
}

export interface IEthereumCurrency {
  currency: IEthereumSymbol;
  value: number;
}

export interface IEthereumSymbol {
  symbol: string;
}
