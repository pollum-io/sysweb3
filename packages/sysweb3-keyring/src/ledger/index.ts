/* eslint-disable camelcase */
/* eslint-disable import/no-named-as-default */
/* eslint-disable import/order */
import Transport from '@ledgerhq/hw-transport';
import HIDTransport from '@ledgerhq/hw-transport-webhid';
import { listen } from '@ledgerhq/logs';
import SysUtxoClient, { DefaultWalletPolicy, PsbtV2 } from './bitcoin_client';
import {
  BLOCKBOOK_API_URL,
  DESCRIPTOR,
  RECEIVING_ADDRESS_INDEX,
  SYSCOIN_NETWORKS,
  WILL_NOT_DISPLAY,
} from './consts';
import { getXpubWithDescriptor } from './utils';
import { fromBase58 } from '@trezor/utxo-lib/lib/bip32';
import { IEvmMethods, IUTXOMethods, MessageTypes, UTXOPayload } from './types';
import { Psbt } from 'bitcoinjs-lib';
import { toSatoshi } from 'satoshi-bitcoin';
import { ITxid } from '@pollum-io/sysweb3-utils';
import LedgerEthClient, { ledgerService } from '@ledgerhq/hw-app-eth';
import { TypedDataUtils, TypedMessage, Version } from 'eth-sig-util';

export class LedgerKeyring {
  public ledgerUtxoClient: SysUtxoClient;
  public ledgerEVMClient: LedgerEthClient;
  public ledgerTransport: Transport;
  public utxo: IUTXOMethods;
  public evm: IEvmMethods;
  public hdPath = '';

  constructor() {
    this.utxo = {
      getUtxos: this.getUtxos,
      sendTransaction: this.sendUTXOTransaction,
      getUtxoAddress: this.getUtxoAddress,
      getXpub: this.getXpub,
      verifyUtxoAddress: this.verifyUtxoAddress,
    };
    this.evm = {
      getEvmAddressAndPubKey: this.getEvmAddressAndPubKey,
      signEVMTransaction: this.signEVMTransaction,
      signPersonalMessage: this.signPersonalMessage,
      signTypedData: this.signTypedData,
    };
  }

  public connectToLedgerDevice = async () => {
    try {
      const connectionResponse = await HIDTransport.create();
      listen((log) => console.log(log));

      this.ledgerUtxoClient = new SysUtxoClient(connectionResponse);
      this.ledgerEVMClient = new LedgerEthClient(connectionResponse);
      this.ledgerTransport = connectionResponse;
      return connectionResponse;
    } catch (error) {
      throw new Error(error);
    }
  };

  private getUtxoAddress = async ({
    coin,
    index, // account index
    slip44,
    showInLedger,
  }: {
    coin: string;
    index: number;
    slip44?: string;
    showInLedger?: boolean;
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

      const address = await this.ledgerUtxoClient.getWalletAddress(
        walletPolicy,
        null,
        RECEIVING_ADDRESS_INDEX,
        index,
        showInLedger ? showInLedger : WILL_NOT_DISPLAY
      );

      return address;
    } catch (error) {
      throw error;
    }
  };

  private verifyUtxoAddress = async (accountIndex: number) => {
    return await this.getUtxoAddress({
      coin: 'sys',
      index: accountIndex,
      slip44: '57',
      showInLedger: true,
    });
  };

  private getUtxos = async ({ accountIndex }: { accountIndex: number }) => {
    const coin = 'sys';
    this.setHdPath(coin, accountIndex);
    const fingerprint = await this.getMasterFingerprint();
    const xpub = await this.ledgerUtxoClient.getExtendedPubkey(this.hdPath);
    const xpubWithDescriptor = getXpubWithDescriptor(
      xpub,
      this.hdPath,
      fingerprint
    );
    const url = `${BLOCKBOOK_API_URL}/api/v2/utxo/${xpubWithDescriptor}`;
    const resp: UTXOPayload = await fetch(url).then((resp) => resp.json());
    return resp.utxos;
  };

  private signPsbt = async ({
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

    const changeAddress = await this.ledgerUtxoClient.getWalletAddress(
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

    const entries = await this.ledgerUtxoClient.signPsbt(
      psbt,
      walletPolicy,
      null
    );
    entries.forEach((entry) => {
      const [index, pubkeySign] = entry;
      bitcoinPsbt.updateInput(index, {
        partialSig: [pubkeySign],
      });
    });

    bitcoinPsbt.finalizeAllInputs();

    const transaction = bitcoinPsbt.extractTransaction();
    return { id: transaction.getId(), hex: transaction.toHex() };
  };

  private sendUTXOTransaction = async ({
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

  private getXpub = async ({
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
      const xpub = await this.ledgerUtxoClient.getExtendedPubkey(this.hdPath);
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
      const signature = await this.ledgerUtxoClient.signMessage(
        bufferMessage,
        path
      );
      return signature;
    } catch (error) {
      throw error;
    }
  };

  private signEVMTransaction = async ({
    rawTx,
    accountIndex,
  }: {
    rawTx: string;
    accountIndex: number;
  }) => {
    this.setHdPath('eth', accountIndex);
    const resolution = await ledgerService.resolveTransaction(rawTx, {}, {});

    const signature = await this.ledgerEVMClient.signTransaction(
      this.hdPath,
      rawTx,
      resolution
    );

    return signature;
  };

  private signPersonalMessage = async ({
    message,
    accountIndex,
  }: {
    message: string;
    accountIndex: number;
  }) => {
    this.setHdPath('eth', accountIndex);

    const signature = await this.ledgerEVMClient.signPersonalMessage(
      this.hdPath,
      message
    );

    return `0x${signature.r}${signature.s}${signature.v.toString(16)}`;
  };

  private sanitizeData(data: any): any {
    switch (Object.prototype.toString.call(data)) {
      case '[object Object]': {
        const entries = Object.keys(data).map((k) => [
          k,
          this.sanitizeData(data[k]),
        ]);
        return Object.fromEntries(entries);
      }

      case '[object Array]':
        return data.map((v: any[]) => this.sanitizeData(v));

      case '[object BigInt]':
        return data.toString();

      default:
        return data;
    }
  }

  private transformTypedData = <T extends MessageTypes>(
    data: TypedMessage<T>,
    metamaskV4Compat: boolean
  ) => {
    if (!metamaskV4Compat) {
      throw new Error(
        'Ledger: Only version 4 of typed data signing is supported'
      );
    }

    const { types, primaryType, domain, message } = this.sanitizeData(data);

    const domainSeparatorHash = TypedDataUtils.hashStruct(
      'EIP712Domain',
      this.sanitizeData(domain),
      types,
      true
    ).toString('hex');

    let messageHash = null;

    if (primaryType !== 'EIP712Domain') {
      messageHash = TypedDataUtils.hashStruct(
        primaryType as string,
        this.sanitizeData(message),
        types,
        true
      ).toString('hex');
    }

    return {
      domain_separator_hash: domainSeparatorHash,
      message_hash: messageHash,
      ...data,
    };
  };

  private getEvmAddressAndPubKey = async ({
    accountIndex,
  }: {
    accountIndex: number;
  }) => {
    this.setHdPath('eth', accountIndex);
    try {
      const { address, publicKey } = await this.ledgerEVMClient.getAddress(
        this.hdPath
      );
      return { address, publicKey: `0x${publicKey}` };
    } catch (error) {
      throw error;
    }
  };

  private signTypedData = async ({
    version,
    data,
    accountIndex,
  }: {
    version: Version;
    data: any;
    accountIndex: number;
  }) => {
    this.setHdPath('eth', accountIndex);
    const dataWithHashes = this.transformTypedData(data, version === 'V4');

    const { domain_separator_hash, message_hash } = dataWithHashes;

    const signature = await this.ledgerEVMClient.signEIP712HashedMessage(
      this.hdPath,
      domain_separator_hash,
      message_hash ? message_hash : ''
    );

    return `0x${signature.r}${signature.s}${signature.v.toString(16)}`;
  };

  private getMasterFingerprint = async () => {
    try {
      const masterFingerprint =
        await this.ledgerUtxoClient.getMasterFingerprint();
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
        this.hdPath = `44'/60'/0'/0/${accountIndex ? accountIndex : 0}`;
        break;
      default:
        this.hdPath = `m/84'/${slip44 ? slip44 : 60}'/0'/0/${
          accountIndex ? accountIndex : 0
        }`;
        break;
    }
  };
}
