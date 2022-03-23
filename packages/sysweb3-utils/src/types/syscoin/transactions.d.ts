import { INetworkType } from './network';
import { ISyscoinToken } from '.';
export declare type ISyscoinVIn = {
    txid: string;
    vout: number;
    sequence: number;
    n: number;
    addresses: string[];
    isAddress: boolean;
    value: number;
};
export declare type ISyscoinVOut = {
    value: number;
    n: number;
    spent: boolean;
    hex: string;
    addresses: string[];
    isAddress: boolean;
};
export declare type ISyscoinTokenTxInfo = {
    tokenId: string;
    value: number;
    valueStr: string;
};
export declare type ISyscoinTransaction = {
    [txid: string]: {
        blockTime: number;
        confirmations: number;
        fees: number;
        tokenType: string;
        txid: string;
        value: number;
        blockHash: string;
        blockHeight: number;
        valueIn: number;
        hex: string;
        version: number;
        vin: ISyscoinVIn[];
        vout: ISyscoinVOut[];
    };
};
export declare type IEthereumTransaction = {
    [INetworkType.Ethereum]: any;
};
export declare type ITxid = {
    txid: string;
};
export declare type ITransactionInfo = {
    amount: number;
    fee: number;
    fromAddress: string;
    rbf: boolean;
    toAddress: string;
    token: ISyscoinToken | null;
};
export declare type INotaryDetails = {
    endpoint?: string | null;
    hdrequired?: boolean;
    instanttransfers?: boolean;
};
export declare type IAuxFees = {
    [auxfees: number]: {
        bound: number;
        percent: number;
    };
};
export declare type INewToken = {
    advanced?: {
        auxfeedetails?: IAuxFees[];
        capabilityflags?: string | '127';
        initialSupply?: number;
        notaryAddress?: string;
        notarydetails?: INotaryDetails;
        payoutAddress?: string;
    };
    description?: string;
    fee: number;
    maxsupply: number;
    precision: number | 8;
    receiver?: string;
    symbol: string;
    initialSupply?: number;
};
export declare type ITokenSend = {
    amount: number;
    fee: number;
    isToken: boolean;
    rbf?: boolean;
    receivingAddress: string;
    sender: string;
    token: string;
};
export declare type ITokenMint = {
    amount: number;
    assetGuid: string;
    fee: number;
};
export declare type INewNFT = {
    description: string;
    fee: number;
    precision: number;
    receivingAddress: string;
    symbol: string;
};
export declare type ITokenUpdate = {
    advanced?: {
        auxfeedetails?: IAuxFees[];
        notaryAddress?: string;
        notarydetails?: INotaryDetails;
        payoutAddress?: string;
    };
    assetGuid: number;
    assetWhiteList: string;
    capabilityflags: string | '127';
    contract: string;
    description: string;
    fee: number;
};
export declare type ITokenTransfer = {
    assetGuid: string;
    fee: number;
    newOwner: string;
};
export declare type ITemporaryTransaction = {
    mintAsset: ITokenMint | null;
    mintNFT: ITokenMint | null;
    newAsset: INewToken | null;
    newNFT: INewNFT | null;
    sendAsset: ITokenSend | null;
    signAndSendPSBT: any | null;
    signPSBT: any | null;
    transferAsset: ITokenTransfer | null;
    updateAsset: ITokenUpdate | null;
};
export declare type IETHTxConfig = {
    gasLimit?: number;
    gasPrice: number;
    memo?: string;
    nonce?: number;
    txData?: string;
};
export declare type IETHNetwork = 'testnet' | 'mainnet';
export interface IETHPendingTx {
    amount: string;
    assetId: string;
    data?: string;
    fromAddress: string;
    gasPrice: number;
    network: IETHNetwork;
    nonce: number;
    onConfirmed?: () => void;
    timestamp: number;
    toAddress: string;
    txHash: string;
}
