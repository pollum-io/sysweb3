/* eslint-disable import/no-named-as-default */
/* eslint-disable import/order */
import Transport from '@ledgerhq/hw-transport';
import HIDTransport from '@ledgerhq/hw-transport-webhid';
import { listen } from '@ledgerhq/logs';
import AppClient, { DefaultWalletPolicy, PsbtV2 } from './bitcoin_client';
import {
  BLOCKBOOK_API_URL,
  DESCRIPTOR,
  HD_PATH_STRING,
  RECEIVING_ADDRESS_INDEX,
  SYSCOIN_NETWORKS,
  WILL_NOT_DISPLAY,
} from './consts';
import { getXpubWithDescriptor } from './utils';
import { fromBase58 } from '@trezor/utxo-lib/lib/bip32';
import { BlockbookTransaction, UTXOPayload } from './types';
import { Psbt } from 'bitcoinjs-lib';
import { toSatoshi } from 'satoshi-bitcoin';
import { ITxid } from '@pollum-io/sysweb3-utils';

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
    slip44?: string;
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

  public getUtxos = async ({ accountIndex }: { accountIndex: number }) => {
    const coin = 'sys';
    this.setHdPath(coin, accountIndex);
    const fingerprint = await this.getMasterFingerprint();
    const xpub = await this.ledgerClient.getExtendedPubkey(this.hdPath);
    const xpubWithDescriptor = getXpubWithDescriptor(
      xpub,
      this.hdPath,
      fingerprint
    );
    const url = `${BLOCKBOOK_API_URL}/api/v2/utxo/${xpubWithDescriptor}`;
    const resp: UTXOPayload = await fetch(url).then((resp) => resp.json());
    return resp.utxos;
  };

  public signPsbt = async ({
    accountIndex,
    amount,
    receivingAddress,
  }: {
    accountIndex: number;
    amount: number;
    receivingAddress: string;
  }) => {
    const coin = 'sys';
    const fingerprint = await this.getMasterFingerprint();
    const xpub = await this.getXpub({ coin, index: accountIndex });
    this.setHdPath(coin, accountIndex);
    const path = this.hdPath;
    const utxos = await this.getUtxos({ accountIndex: accountIndex });

    const account = fromBase58(xpub);

    const loadInputs = utxos.map(async (utxo: any) => {
      const url = `${BLOCKBOOK_API_URL}/api/v2/tx/${utxo.txid}`;

      const derivationTokens = utxo.path.replace(path, '').split('/');

      const derivedAccount = derivationTokens.reduce((acc: any, token: any) => {
        const der = parseInt(token);
        if (isNaN(der)) {
          return acc;
        }
        return acc.derive(der);
      }, account);
      const txResponse = await fetch(url);

      const transaction = await txResponse.json();

      const vout = transaction.vout[utxo.vout];
      const input = {
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(vout.hex, 'hex'),
          value: parseInt(vout.value, 10),
        },
        bip32Derivation: [
          {
            masterFingerprint: Buffer.from(fingerprint, 'hex'),
            pubkey: derivedAccount.publicKey,
            path: utxo.path,
          },
        ],
      };
      return input;
    });

    const inputs = await Promise.all(loadInputs);

    const bitcoinPsbt = new Psbt({
      network: SYSCOIN_NETWORKS.mainnet,
    });

    bitcoinPsbt.addInputs(inputs);

    bitcoinPsbt.addOutput({
      address: receivingAddress,
      value: toSatoshi(amount),
    });

    const policy = `[${path}]${xpub}`.replace('m', fingerprint);
    const walletPolicy = new DefaultWalletPolicy(DESCRIPTOR, policy);

    const changeAddress = await this.ledgerClient.getWalletAddress(
      walletPolicy,
      null,
      1,
      0,
      false
    );

    const fees = toSatoshi(0.00001);

    const total = utxos.reduce((acc: any, utxo: any) => {
      return acc + parseInt(utxo.value);
    }, 0);

    bitcoinPsbt.addOutput({
      address: changeAddress,
      value: total - toSatoshi(amount) - fees,
    });

    const psbt = new PsbtV2();

    psbt.fromBitcoinJS(bitcoinPsbt);

    const entries = await this.ledgerClient.signPsbt(psbt, walletPolicy, null);
    entries.forEach((entry) => {
      const [index, pubkeySign] = entry;
      bitcoinPsbt.updateInput(index, {
        partialSig: [
          {
            pubkey: pubkeySign.pubkey as Buffer,
            signature: pubkeySign.signature as Buffer,
          },
        ],
      });
    });

    bitcoinPsbt.finalizeAllInputs();

    const transaction = bitcoinPsbt.extractTransaction();
    return { id: transaction.getId(), hex: transaction.toHex() };
  };

  public sendTransaction = async ({
    accountIndex,
    amount,
    receivingAddress,
  }: {
    accountIndex: number;
    amount: number;
    receivingAddress: string;
  }): Promise<ITxid> => {
    try {
      const transaction = await this.signPsbt({
        accountIndex,
        amount,
        receivingAddress,
      });
      const url = `${BLOCKBOOK_API_URL}/api/v2/sendtx/`;

      const resp = await fetch(url, {
        method: 'POST',
        body: transaction.hex,
      });
      const data = await resp.json();
      return { txid: data.result };
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
    slip44?: string;
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

  private setHdPath = (coin: string, accountIndex: number, slip44?: string) => {
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
        this.hdPath = `m/84'/${slip44 ? slip44 : 60}'/0'/0/${
          accountIndex ? accountIndex : 0
        }`;
        break;
    }
  };
}
