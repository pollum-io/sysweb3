import sys from 'syscoinjs-lib';
import { Signer } from '@pollum-io/sysweb3-keyring';
import { ITokenMap } from './types';

export const txUtils = () => {
  const { main } = Signer();

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

  return {
    getPsbtFromJson,
    getRawTransaction,
    getTokenMap,
    getFeeRate
  }
}