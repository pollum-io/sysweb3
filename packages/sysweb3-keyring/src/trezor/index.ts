/* eslint-disable camelcase */
import TrezorConnect, {
  AccountInfo,
  DEVICE_EVENT,
  SignTransaction,
} from '@trezor/connect-web';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import Web3 from 'web3';

const initialHDPath = `m/44'/60'/0'/0/0`;
const pathBase = `m/44'/60'/0'/0`;
// const MAX_INDEX = 1000;
const DELAY_BETWEEN_POPUPS = 1000;
const TREZOR_CONNECT_MANIFEST = {
  appUrl: 'https://paliwallet.com/',
  email: 'pali@pollum.io',
};

export interface TrezorControllerState {
  hdPath: string;
  paths: Record<string, number>;
}

interface ISignUtxoTx extends SignTransaction {
  coin: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  interface Window {
    TrezorConnect: any;
  }
}
export class TrezorKeyring {
  public hdPath: string = initialHDPath;
  public publicKey: Buffer;
  public chainCode: Buffer;
  public paths: Record<string, number> = {};
  public model?: string;

  constructor() {
    this.publicKey = Buffer.from('', 'hex');
    this.chainCode = Buffer.from('', 'hex');
    this.hdPath = '';
    this.paths = {};
    TrezorConnect.on(DEVICE_EVENT, (event: any) => {
      if (event.payload.features) {
        this.model = event.payload.features.model;
      }
    });
    this.init();
  }

  /**
   * Initialize Trezor script.
   *
   * Trezor Connect raises an error that reads "Manifest not set" if manifest is not provided. It can be either set via manifest method or passed as a param in init method.
   * @returns true, if trezor was initialized successfully and false, if some error happen
   */

  private async init() {
    if (window) {
      window.TrezorConnect = TrezorConnect;
    }
    try {
      await TrezorConnect.init({
        manifest: TREZOR_CONNECT_MANIFEST,
        lazyLoad: true,
        connectSrc: 'https://connect.trezor.io/9/',
      });
      return true;
    } catch (error) {
      if (
        error.message.includes('TrezorConnect has been already initialized')
      ) {
        return true;
      }
      return false;
    }
  }

  /**
   * This return derivated account info based in params provided.
   *
   * @param index - index of account for path derivation
   * @param slip44 - network slip44 number
   * @param bip - BIP for derivation. Example: 44, 49, 84
   * @param coin - network symbol. Example: eth, sys, btc
   * @returns derivated account info or error
   */

  public async deriveAccount({
    index,
    slip44,
    bip,
    coin,
  }: {
    index: number;
    slip44: number | string;
    bip: number;
    coin: string;
  }): Promise<
    | AccountInfo
    | {
        error: string;
        code?: string;
      }
  > {
    const keypath = `m/${bip}'/${slip44}'/0'/0/${index}`;

    return new Promise((resolve, reject) => {
      TrezorConnect.getAccountInfo({
        path: keypath,
        coin: coin,
      })
        .then((response) => {
          if (response.success) {
            resolve(response.payload);
          }
          // @ts-ignore
          reject(response.payload.error);
        })
        .catch((error) => {
          console.error('TrezorConnectError', error);
          reject(error);
        });
    });
  }

  /**
   * This return account info based in params provided.
   *
   * @param coin - network symbol. Example: eth, sys, btc
   * @param slip44 - network slip44 number
   * @param hdPath - path derivation. Example: m/44'/57'/0'/0/0
   * @param index - index of account for path derivation
   * @returns derivated account info or error
   */

  public async getAccountInfo({
    coin,
    slip44,
    hdPath,
    index,
  }: {
    coin: string;
    slip44: string;
    hdPath?: string;
    index?: string;
  }): Promise<AccountInfo> {
    switch (coin) {
      case 'sys':
        this.hdPath = `m/84'/57'/0'`;
        break;
      case 'btc':
        this.hdPath = "m/84'/0'/0'";
        break;
      default:
        this.hdPath = `m/44'/${slip44}'/0'/0/${index ? index : 0}`;
        break;
    }

    if (hdPath) this.hdPath === hdPath;

    const response = await TrezorConnect.getAccountInfo({
      coin,
      path: this.hdPath,
    });

    if (response.success) {
      return response.payload;
    }
    return response.payload as any;
  }

  /**
   * Gets the model, if known.
   * This may be `undefined` if the model hasn't been loaded yet.
   *
   * @returns
   */
  public getModel(): string | undefined {
    return this.model;
  }

  /**
   * This removes the Trezor Connect iframe from the DOM
   *
   * @returns void
   */

  public dispose() {
    TrezorConnect.dispose();
  }

  /**
   * This verify if message is valid or not.
   *
   * @param coin - network symbol. Example: eth, sys, btc
   * @param address - account address that signed message
   * @param message - message to be verified. Example: 'Test message'
   * @param signature - signature received in sign method. Example: I6BrpivjCwZmScZ6BMAHWGQPo+JjX2kzKXU5LcGVfEgvFb2VfJuKo3g6eSQcykQZiILoWNUDn5rDHkwJg3EcvuY=
   * @returns derivated account info or error
   */

  public async verifyMessage({
    coin,
    address,
    message,
    signature,
  }: {
    coin: string;
    address: string;
    message: string;
    signature: string;
  }) {
    try {
      let method = '';
      switch (coin) {
        case 'eth':
          method = 'ethereumVerifyMessage';
          break;
        default:
          method = 'verifyMessage';
      }
      // @ts-ignore
      const { success, payload } = await TrezorConnect[method]({
        coin,
        address,
        message,
        signature,
      });

      if (success) {
        return { success, payload };
      }
      return { success: false, payload };
    } catch (error) {
      return { error };
    }
  }

  /**
   * This return account public key.
   *
   * @param coin - network symbol. Example: eth, sys, btc
   * @param slip44 - network slip44 number
   * @param hdPath - path derivation. Example: m/44'/57'/0'/0/0
   * @returns publicKey and chainCode
   */

  public async getPublicKey({
    coin,
    slip44,
    hdPath,
  }: {
    coin: string;
    slip44: string;
    hdPath?: string;
  }) {
    switch (coin) {
      case 'sys':
        this.hdPath = `m/84'/57'/0'`;
        break;
      case 'btc':
        this.hdPath = "m/84'/0'/0'";
        break;
      default:
        this.hdPath = `m/44'/${slip44}'/0'/0/0`;
        break;
    }

    if (hdPath) this.hdPath = hdPath;

    try {
      const { success, payload } = await TrezorConnect.getPublicKey({
        coin: coin,
        path: this.hdPath,
      });

      if (success) {
        const { publicKey, chainCode } = payload;

        this.publicKey = Buffer.from(publicKey, 'hex');
        this.chainCode = Buffer.from(chainCode, 'hex');

        return {
          publicKey: `0x${this.publicKey.toString('hex')}`,
          chainCode: `0x${this.chainCode.toString('hex')}`,
        };
      }

      return { success: false, payload };
    } catch (error) {
      return error;
    }
  }

  /**
   * Gets account address based in index of account in path derivation.
   *
   * @param coin - network symbol. Example: eth, sys, btc
   * @param slip44 - network slip44 number
   * @param index - index of account for path derivation
   * @returns account address
   */

  public async getAccountAddressByIndex({
    index,
    coin,
    slip44,
  }: {
    index: number;
    coin: string;
    slip44: string;
  }) {
    switch (coin) {
      case 'sys':
        this.hdPath = `m/84'/57'/0'`;
        break;
      case 'btc':
        this.hdPath = "m/84'/0'/0'";
        break;
      case 'eth':
        this.hdPath = pathBase;
        break;
      default:
        this.hdPath = `m/44'/${slip44}'/0'/0`;
        break;
    }

    const account = await this._addressFromIndex(
      this.hdPath,
      index,
      coin,
      slip44
    );
    this.paths[account] = index;

    return account;
  }

  /**
   * This sign UTXO tx.
   *
   * @param coin - network symbol. Example: eth, sys, btc
   * @param inputs - utxo transaction inputs
   * @param outputs - utxo transaction outputs
   * @returns signature object
   */

  public async signUtxoTransaction({ inputs, outputs, coin }: ISignUtxoTx) {
    try {
      const { payload, success } = await TrezorConnect.signTransaction({
        coin,
        inputs,
        outputs,
      });

      if (success) {
        return { success, payload };
      }
      return { success: false, payload };
    } catch (error) {
      return { error };
    }
  }

  /**
   * This sign EVM tx.
   *
   * @param index - index of account for path derivation
   * @param tx - ethereum tx object
   * @returns signature object
   */
  public async signEthTransaction({ tx, index }: { tx: any; index: string }) {
    try {
      const { success, payload } = await TrezorConnect.ethereumSignTransaction({
        path: `m/44'/60'/0'/0/${index}`,
        transaction: tx,
      });

      if (success) {
        return { success, payload };
      }
      return { success: false, payload };
    } catch (error) {
      return { error };
    }
  }

  /**
   * This sign message.
   *
   * @param coin - network symbol. Example: eth, sys, btc
   * @param slip44 - network slip44 number
   * @param message - message to be signed. Example: 'Test message'
   * @param index - index of account for path derivation
   * @returns signature object
   */

  public async signMessage({
    index,
    message,
    coin,
    slip44,
  }: {
    index?: number;
    message?: string;
    coin: string;
    slip44?: string;
  }) {
    switch (coin) {
      case 'sys':
        this.hdPath = `m/84'/57'/0'/0/${index ? index : 0}`;
        break;
      case 'btc':
        this.hdPath = `m/84'/0'/0'/0/${index ? index : 0}`;
        break;
      default:
        this.hdPath = `m/44'/${slip44}'/0'/0/${index ? index : 0}`;
        break;
    }

    if (coin === 'eth' && `${index ? index : 0}` && message) {
      return this._signEthPersonalMessage(Number(index), message);
    }
    return this._signUtxoPersonalMessage({ coin, hdPath: this.hdPath });
  }

  private async _signUtxoPersonalMessage({
    coin,
    hdPath,
  }: {
    coin: string;
    hdPath: string;
  }) {
    try {
      const { success, payload } = await TrezorConnect.signMessage({
        path: hdPath,
        coin: coin,
        message: 'UTXO example message',
      });

      if (success) {
        return { success, payload };
      }
      return { success: false, payload };
    } catch (error) {
      return { error };
    }
  }

  // For personal_sign, we need to prefix the message:
  private async _signEthPersonalMessage(accountIndex: number, message: string) {
    const accountAddress = await this.getAddress({
      index: accountIndex,
      coin: 'eth',
      slip44: '60',
    });
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        TrezorConnect.ethereumSignMessage({
          path: initialHDPath,
          message: Web3.utils.stripHexPrefix(message),
        })
          .then((response) => {
            if (response.success) {
              if (
                accountAddress &&
                response.payload.address.toLowerCase() !==
                  accountAddress.toLowerCase()
              ) {
                reject(new Error('signature doesnt match the right address'));
              }
              const signature = `0x${response.payload.signature}`;
              resolve({ signature, success: true });
            } else {
              reject(
                // @ts-ignore
                new Error(response.payload.error || 'Unknown error')
              );
            }
          })
          .catch((e) => {
            reject(new Error(e.toString() || 'Unknown error'));
          });
        // This is necessary to avoid popup collision
        // between the unlock & sign trezor popups
      }, DELAY_BETWEEN_POPUPS);
    });
  }

  /**
   * EIP-712 Sign Typed Data
   */
  //   async signTypedData({
  //     version,
  //     address,
  //     data,
  //   }: {
  //     version: 'V1' | 'V3' | 'V4';
  //     address: string;
  //     data: any;
  //   }) {
  //     const dataWithHashes = transformTypedData(data, version === 'V4');

  //     // set default values for signTypedData
  //     // Trezor is stricter than @metamask/eth-sig-util in what it accepts
  //     const {
  //       types,
  //       message = {},
  //       domain = {},
  //       primaryType,
  //       // snake_case since Trezor uses Protobuf naming conventions here
  //       domain_separator_hash, // eslint-disable-line camelcase
  //       message_hash, // eslint-disable-line camelcase
  //     } = dataWithHashes;

  //     // This is necessary to avoid popup collision
  //     // between the unlock & sign trezor popups

  //     const response = await TrezorConnect.ethereumSignTypedData({
  //       path: await this._pathFromAddress(address, 'eth', '60'),
  //       data: {
  //         types: {
  //           ...types,
  //           EIP712Domain: types.EIP712Domain ? types.EIP712Domain : [],
  //         },
  //         message,
  //         domain,
  //         primaryType: primaryType as any,
  //       },
  //       metamask_v4_compat: true,
  //       // Trezor 1 only supports blindly signing hashes
  //       domain_separator_hash,
  //       message_hash: message_hash ? message_hash : '',
  //     });

  //     if (response.success) {
  //       if (address !== response.payload.address) {
  //         throw new Error('signature doesnt match the right address');
  //       }
  //       return response.payload;
  //     }
  //     // @ts-ignore
  //     throw new Error(response.payload.error || 'Unknown error');
  //   }

  private async _addressFromIndex(
    basePath: string,
    i: number,
    coin: string,
    slip44: string
  ) {
    this.hdPath = `${basePath}/${i}`;
    await this.getPublicKey({ coin, slip44, hdPath: this.hdPath });
    const address = ethers.utils.computeAddress(
      `0x${this.publicKey.toString('hex')}`
    );
    return `${address}`;
  }

  /**
   * Gets account address based in index of account in path derivation.
   *
   * @param coin - network symbol. Example: eth, sys, btc
   * @param slip44 - network slip44 number
   * @param index - index of account for path derivation
   * @returns account address
   */

  public async getAddress({
    coin,
    slip44,
    index,
  }: {
    coin: string;
    index: string | number;
    slip44?: string;
  }): Promise<string | undefined> {
    switch (coin) {
      case 'sys':
        this.hdPath = `m/84'/57'/0'/0`;
        break;
      case 'btc':
        this.hdPath = "m/84'/0'/0'";
        break;
      default:
        this.hdPath = `m/44'/${slip44}'/0'/0`;
        break;
    }
    try {
      const { payload, success } = await TrezorConnect.getAddress({
        path: `${this.hdPath}/${index}`,
        coin,
      });
      if (success) {
        return payload.address;
      }
    } catch (error) {
      return error;
    }
  }

  //   private async _pathFromAddress(
  //     address: string,
  //     coin: string,
  //     slip44: string
  //   ) {
  //     if (ethers.utils.isAddress(address)) {
  //       const checksummedAddress = address;
  //       let index = this.paths[checksummedAddress];
  //       if (typeof index === 'undefined') {
  //         for (let i = 0; i < MAX_INDEX; i++) {
  //           if (
  //             checksummedAddress ===
  //             (await this._addressFromIndex(pathBase, i, coin, slip44))
  //           ) {
  //             index = i;
  //             break;
  //           }
  //         }
  //       }

  //       if (typeof index === 'undefined') {
  //         throw new Error('Unknown address');
  //       }
  //       return `${pathBase}/${index}`;
  //     }
  //     return '';
  //   }
}
