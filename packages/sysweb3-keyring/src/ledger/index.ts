/* eslint-disable import/no-named-as-default */
/* eslint-disable import/order */
import Transport from '@ledgerhq/hw-transport';
import HIDTransport from '@ledgerhq/hw-transport-webhid';
import { listen } from '@ledgerhq/logs';
import AppClient, { DefaultWalletPolicy } from './bitcoin_client';
import {
  DESCRIPTOR,
  HD_PATH_STRING,
  RECEIVING_ADDRESS_INDEX,
  WILL_NOT_DISPLAY,
} from './consts';
import { getXpubWithDescriptor } from './utils';

export class LedgerKeyring {
  public ledgerClient: AppClient;
  public ledgerTransport: Transport;
  public hdPath = HD_PATH_STRING;

  public connectToLedgerDevice = async () => {
    try {
      const connectionResponse = await HIDTransport.create();
      listen((log) => console.log(log));

      this.ledgerClient = new AppClient(connectionResponse);
      this.ledgerTransport = connectionResponse;
      return connectionResponse;
    } catch (error) {
      throw new Error(error);
    }
  };

  public getAddress = async ({
    coin,
    index, // account index
    slip44,
  }: {
    coin: string;
    index: number;
    slip44: string;
  }) => {
    try {
      const fingerprint = await this.getMasterFingerprint();
      const xpub = await this.getXpub({ index, coin, slip44 });
      this.setHdPath(coin, index, slip44);

      const xpubWithDescriptor = `[${this.hdPath}]${xpub}`.replace(
        'm',
        fingerprint
      );
      const walletPolicy = new DefaultWalletPolicy(
        DESCRIPTOR,
        xpubWithDescriptor
      );

      const address = await this.ledgerClient.getWalletAddress(
        walletPolicy,
        null,
        RECEIVING_ADDRESS_INDEX,
        index,
        WILL_NOT_DISPLAY
      );

      return address;
    } catch (error) {
      throw error;
    }
  };

  public getXpub = async ({
    index,
    coin,
    slip44,
    withDecriptor,
  }: {
    index: number;
    coin: string;
    slip44: string;
    withDecriptor?: boolean;
  }) => {
    try {
      const fingerprint = await this.getMasterFingerprint();
      this.setHdPath(coin, index, slip44);
      const xpub = await this.ledgerClient.getExtendedPubkey(this.hdPath);
      const xpubWithDescriptor = getXpubWithDescriptor(
        xpub,
        this.hdPath,
        fingerprint
      );

      return withDecriptor ? xpubWithDescriptor : xpub;
    } catch (error) {
      throw error;
    }
  };

  public signUtxoMessage = async (path: string, message: string) => {
    try {
      const bufferMessage = Buffer.from(message);
      const signature = await this.ledgerClient.signMessage(
        bufferMessage,
        path
      );
      return signature;
    } catch (error) {
      throw error;
    }
  };

  public getMasterFingerprint = async () => {
    try {
      const masterFingerprint = await this.ledgerClient.getMasterFingerprint();
      return masterFingerprint;
    } catch (error) {
      console.log('Fingerprint error: ', error);
      throw error;
    }
  };

  private setHdPath = (coin: string, accountIndex: number, slip44: string) => {
    switch (coin) {
      case 'sys':
        this.hdPath = `m/84'/57'/${accountIndex}'`;
        break;
      case 'btc':
        this.hdPath = `m/84'/0'/${accountIndex}'`;
        break;
      case 'eth':
        this.hdPath = `m/44'/60'/0'/0/${accountIndex ? accountIndex : 0}`;
        break;
      default:
        this.hdPath = `m/84'/${slip44}'/0'/0/${
          accountIndex ? accountIndex : 0
        }`;
        break;
    }
  };
}
