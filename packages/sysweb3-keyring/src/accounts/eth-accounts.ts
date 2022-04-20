import { TransactionResponse } from '@ethersproject/abstract-provider';
import axios from 'axios';
import * as sigUtil from 'eth-sig-util';
import * as ethUtil from 'ethereumjs-util';
import { ethers } from 'ethers';
import { request, gql } from 'graphql-request';
import _ from 'lodash';
import { Account, TransactionReceipt } from 'web3-core';

import { web3Provider } from '@pollum-io/sysweb3-network';

export const Web3Accounts = () => {
  /**
   * This function should return an Account Object.
   *
   * Use example:
   *
   * ```
   * <button onClick={createAccount}>Create your Account!</button>
   * ```
   *
   */
  const createAccount = (): Account => web3Provider.eth.accounts.create();

  /**
   * This function should return the balance of current account.
   *
   * @param {string} address
   *
   * @example
   *
   * ```
   * <button onClick={getBalance('0x000000000000000')}>Get balance</button>
   * ```
   */

  const getBalance = async (address: string): Promise<number> => {
    try {
      const balance = await web3Provider.eth.getBalance(address);
      const formattedBalance = web3Provider.utils.fromWei(balance);

      const roundedBalance = _.floor(parseFloat(formattedBalance), 4);

      return roundedBalance;
    } catch (error) {
      // todo: handle error
      console.log(`${error}`);

      return 0;
    }
  };

  /**
   * This function should return a user NFT object (if account have any NFT).
   *
   * @param {string} address
   *
   * @example
   *
   * ```
   * <button onClick={getUserNFT}>Get User Available NFTs from account</button>
   * ```
   */

  const getNftsByAddress = async (
    address: string
  ): Promise<object | undefined> => {
    try {
      const { data } = await axios.get(
        `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${address}&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=K46SB2PK5E3T6TZC81V1VK61EFQGMU49KA`
      );

      if (data.message === 'OK' && data.result !== []) {
        return data.result;
      }

      return;
    } catch (error) {
      // todo: handle error
      console.log(error);
      throw error;
    }
  };

  /**
   * This function should return an array with all available currencies of provide wallet address.
   *
   * @param {string} address
   *
   * @example
   *
   * ```
   * <button onClick={getTokens('0x00000000000000000')}>Get all available tokens!</button>
   * ```
   *
   */

  const getTokens = async (address: string): Promise<any> => {
    const query = gql`
        {
          ethereum {
            address(
              address: { is: "${address}" }
            ) {
              balances {
                currency {
                  symbol
                }
                value
              }
            }
          }
        }
      `;

    try {
      const { ethereum } = await request({
        url: 'https://graphql.bitquery.io/',
        document: query,
        requestHeaders: {
          'X-API-KEY': 'BQYvhnv04csZHaprIBZNwtpRiDIwEIW9',
        },
      });

      if (ethereum.address[0].balances) {
        return ethereum.address[0].balances;
      }
    } catch (error) {
      // todo: handle error
      throw new Error('Not available tokens');
    }
  };

  /**
   * This function should return an Account Object from imported wallet.
   *
   * @param {string} mnemonic
   *
   * @example
   *
   * ```
   * <button onClick={importAccount('this test mnemonic phrase for import my account')}>Import My account</button>
   * ```
   *
   */

  const importAccount = (mnemonic: string): Account => {
    try {
      if (web3Provider.utils.isHexStrict(mnemonic)) {
        return web3Provider.eth.accounts.privateKeyToAccount(mnemonic);
      }

      const { privateKey } = ethers.Wallet.fromMnemonic(mnemonic);

      const account = web3Provider.eth.accounts.privateKeyToAccount(privateKey);

      return account;
    } catch (error) {
      // todo: handle
      console.log(error);
      throw error;
    }
  };

  // const getRecommendedFee = () => { };
  const getUserTransactions = async (
    address: string,
    network: string
  ): Promise<TransactionResponse[] | undefined> => {
    const etherscanProvider = new ethers.providers.EtherscanProvider(
      network, // homestead === mainnet
      'K46SB2PK5E3T6TZC81V1VK61EFQGMU49KA'
    );
    try {
      const userTxs = etherscanProvider.getHistory(address);
      if (userTxs) {
        return userTxs;
      }
      return [];
    } catch (error) {
      console.log(error);
    }
  };

  const getTransactionCount = async (address: string) =>
    await web3Provider.eth.getTransactionCount(address);

  const eth_signTypedData_v4 = (msgParams: object) => {
    const msg = JSON.stringify(msgParams);
    const provider = window.pali.getProvider('ethereum');

    const from = provider.selectedAddress;

    const params = [from, msg];
    const method = 'eth_signTypedData_v4';

    return provider.request(
      {
        method,
        params,
        from,
      },
      (err: any, result: any) => {
        if (err) return console.dir(err);
        if (result.error) {
          alert(result.error.message);
        }
        if (result.error) return console.error('ERROR', result);
        console.log('TYPED SIGNED:' + JSON.stringify(result.result));

        const recovered = sigUtil.recoverTypedSignature_v4({
          data: JSON.parse(msg),
          sig: result.result,
        });

        if (
          ethUtil.toChecksumAddress(recovered) ===
          ethUtil.toChecksumAddress(from)
        ) {
          alert('Successfully recovered signer as ' + from);
        } else {
          alert(
            'Failed to verify signer when comparing ' + result + ' to ' + from
          );
        }
      }
    );
  };

  const getRecommendedGasPrice = async (formatted?: boolean) => {
    const gasPriceBN = await web3Provider.eth.getGasPrice();

    if (formatted) {
      return ethers.utils.formatEther(gasPriceBN);
    }

    return gasPriceBN.toString();
  };

  const getFeeByType = async (type: string) => {
    const gasPrice = await getRecommendedGasPrice(false);

    const low = web3Provider.utils
      .toBN(gasPrice)
      .mul(web3Provider.utils.toBN(8))
      .div(web3Provider.utils.toBN(10))
      .toString();

    const high = web3Provider.utils
      .toBN(gasPrice)
      .mul(web3Provider.utils.toBN(11))
      .div(web3Provider.utils.toBN(10))
      .toString();

    if (type === 'low') return low;
    if (type === 'high') return high;

    return gasPrice;
  };

  const getGasLimit = async (toAddress: string) => {
    return await web3Provider.eth.estimateGas({
      to: toAddress,
    });
  };

  const sendTransaction = async ({
    sender,
    senderXprv,
    receivingAddress,
    amount,
    gasLimit,
    gasPrice,
  }: {
    sender: string;
    senderXprv: string;
    receivingAddress: string;
    amount: number;
    gasLimit?: number;
    gasPrice?: number;
  }): Promise<TransactionReceipt> => {
    const defaultGasPrice = await getRecommendedGasPrice(false);
    const defaultGasLimit = await getGasLimit(receivingAddress);

    const signedTransaction = await web3Provider.eth.accounts.signTransaction(
      {
        from: sender,
        to: receivingAddress,
        value: web3Provider.utils.toWei(amount.toString(), 'ether'),
        gas: gasLimit || defaultGasLimit,
        gasPrice: gasPrice || defaultGasPrice,
        nonce: await web3Provider.eth.getTransactionCount(sender, 'latest'),
      },
      senderXprv
    );
    try {
      return web3Provider.eth
        .sendSignedTransaction(`${signedTransaction.rawTransaction}`)
        .then((result: TransactionReceipt) => result);
    } catch (error: any) {
      throw new Error(error);
    }
  };

  const getGasOracle = async () => {
    const {
      data: { result },
    } = await axios.get(
      'https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=K46SB2PK5E3T6TZC81V1VK61EFQGMU49KA'
    );

    return result;
  };

  const tx = {
    getTransactionCount,
    eth_signTypedData_v4,
    sendTransaction,
    getFeeByType,
    getGasLimit,
    getRecommendedGasPrice,
    getGasOracle,
  };

  return {
    createAccount,
    getBalance,
    getTokens,
    getNftsByAddress,
    importAccount,
    getUserTransactions,
    tx,
  };
};
