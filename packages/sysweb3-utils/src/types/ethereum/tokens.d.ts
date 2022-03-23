import { IEthereumAddress } from './accounts';
export declare type IEthereumTokensResponse = {
    ethereum: IEthereumAddress;
};
export declare type IEthereumToken = {
    id: string;
    name: string;
    symbol: string;
    market_cap_rank: number;
    thumb: string;
    large: string;
};
export declare type IEthereumNft = {
    blockNumber: string;
    timeStamp: string;
    hash: string;
    nonce: string;
    blockHash: string;
    from: string;
    contractAddress: string;
    to: string;
    tokenID: string;
    tokenName: string;
    tokenSymbol: string;
    tokenDecimal: string;
    transactionIndex: string;
    gas: string;
    gasPrice: string;
    gasUsed: string;
    cumulativeGasUsed: string;
    input: string;
    confirmations: string;
};
export declare type IErc20Token = {
    name: string;
    symbol: string;
    decimals: number;
};
