export declare enum IKeyringTokenType {
    SYS = "SYS",
    ETH = "ETH",
    ERC20 = "ERC20"
}
export declare type ISyscoinToken = {
    type: string;
    name: string;
    path: string;
    tokenId: string;
    transfers: number;
    symbol: string;
    decimals: number;
    balance: number;
    totalReceived: string;
    totalSent: string;
};
export declare type IAddressMap = {
    changeAddress: string;
    outputs: [
        {
            value: number;
            address: string;
        }
    ];
};
export declare type ITokenMap = Map<string, IAddressMap>;
