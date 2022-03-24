export declare type IEthereumAddress = {
    address: IEthereumBalance[];
};
export declare type IEthereumBalance = {
    balances: IEthereumCurrency[];
};
export declare type IEthereumCurrency = {
    currency: {
        symbol: string;
    };
    value: number;
};
