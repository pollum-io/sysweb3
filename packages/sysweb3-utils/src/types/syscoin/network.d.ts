export declare enum INetworkType {
    Ethereum = "ethereum",
    Syscoin = "syscoin"
}
export declare type INetwork = {
    chainId: number;
    url: string;
    default?: boolean;
    label: string;
};
