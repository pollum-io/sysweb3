import sys from 'syscoinjs-lib';

import { ITokenMap, ISyscoinToken, INetworkType } from '.';
import { web3Provider } from '@pollum-io/sysweb3-network';

export const txUtils = (main: any) => {
  const getRawTransaction = (txid: string) =>
    sys.utils.fetchBackendRawTx(main.blockbookURL, txid);

  const getPsbtFromJson = (psbt: JSON): string =>
    sys.utils.importPsbtFromJson(psbt);

  const getTokenMap = ({
    guid,
    changeAddress,
    amount,
    receivingAddress,
  }: {
    guid: number | string;
    changeAddress: string;
    amount: number;
    receivingAddress: string;
  }): ITokenMap => {
    return new Map([
      [
        String(guid),
        {
          changeAddress,
          outputs: [
            {
              value: amount,
              address: receivingAddress,
            },
          ],
        },
      ],
    ]);
  };

  const getFeeRate = (fee: number): BigInt => new sys.utils.BN(fee * 1e8);

  /**
   * This function should return gas used and the effective gas price by transaction hash.
   *
   * @param {string} transactionHash
   *
   * @example
   *
   * ```
   * <button onClick={getGasUsedInTransaction('0x00000000000000000000089000000000000000')}>Get gas used!</button>
   * ```
   */
  const getGasUsedInTransaction = async (transactionHash: string) => {
    try {
      const { gasUsed, effectiveGasPrice } =
        await web3Provider.eth.getTransactionReceipt(transactionHash);

      if (!gasUsed || !effectiveGasPrice) {
        throw new Error(
          'Can not find this transaction at the current network, please verify it and try again.'
        );
      }

      return {
        gasUsed,
        effectiveGasPrice,
      };
    } catch (error) {
      throw new Error(
        `Incorrect transaction hash, please try again with a correct one!`
      );
    }
  };

  return {
    getPsbtFromJson,
    getRawTransaction,
    getTokenMap,
    getFeeRate,
    getGasUsedInTransaction,
  };
};

export type ISyscoinVIn = {
  txid: string;
  vout: number;
  sequence: number;
  n: number;
  addresses: string[];
  isAddress: boolean;
  value: number;
};

export type ISyscoinVOut = {
  value: number;
  n: number;
  spent: boolean;
  hex: string;
  addresses: string[];
  isAddress: boolean;
};

export type ISyscoinTokenTxInfo = {
  tokenId: string;
  value: number;
  valueStr: string;
};

export type ISyscoinTransaction = {
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

export type IEthereumTransaction = {
  [INetworkType.Ethereum]: any;
};

export type ITxid = { txid: string };

export type ITransactionInfo = {
  amount: number;
  fee: number;
  fromAddress: string;
  rbf: boolean;
  toAddress: string;
  token: ISyscoinToken | null;
};

export type INotaryDetails = {
  endpoint?: string | null;
  hdrequired?: boolean;
  instanttransfers?: boolean;
};

export type IAuxFees = {
  [auxfees: number]: {
    bound: number;
    percent: number;
  };
};

export type INewToken = {
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

export type ITokenSend = {
  amount: number;
  fee: number;
  isToken: boolean;
  rbf?: boolean;
  receivingAddress: string;
  sender: string;
  token: string;
};

export type ITokenMint = {
  amount: number;
  assetGuid: string;
  fee: number;
};

export type INewNFT = {
  description: string;
  fee: number;
  precision: number;
  receivingAddress: string;
  symbol: string;
};

export type ITokenUpdate = {
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

export type ITokenTransfer = {
  assetGuid: string;
  fee: number;
  newOwner: string;
};

export type ITemporaryTransaction = {
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

export type IETHTxConfig = {
  gasLimit?: number;
  gasPrice: number;
  memo?: string;
  nonce?: number;
  txData?: string;
};

export type IETHNetwork = 'testnet' | 'mainnet';

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
