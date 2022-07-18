import { TransactionResponse } from '@ethersproject/abstract-provider';
import axios from 'axios';
import * as sigUtil from 'eth-sig-util';
import * as ethUtil from 'ethereumjs-util';
import { ethers } from 'ethers';
import { request, gql } from 'graphql-request';
import _ from 'lodash';
import { Account, TransactionReceipt } from 'web3-core';

import { web3Provider } from '@pollum-io/sysweb3-network';
import {
  createContractUsingAbi,
  getErc20Abi,
  INetwork,
} from '@pollum-io/sysweb3-utils';

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
      throw new Error(`No balance available for this address. Error: ${error}`);
    }
  };

  /**
   * This function should return the balance of any token using the current account.
   *
   * @param {string} tokenAddress
   * @param {string} walletAddress
   *
   * @example
   *
   * ```
   * <button onClick={getBalanceOfAnyToken('0x000000000000000', '0x000000000000000')}>Get balance of token</button>
   * ```
   */

  const getBalanceOfAnyToken = async (
    tokenAddress: string,
    walletAddress: string
  ): Promise<number> => {
    try {
      const abi = getErc20Abi() as any;
      const balance = await (
        await createContractUsingAbi(abi, tokenAddress)
      ).methods
        .balanceOf(walletAddress)
        .call();

      const formattedBalance = web3Provider.utils.fromWei(balance);

      const roundedBalance = _.floor(parseFloat(formattedBalance), 4);

      return roundedBalance;
    } catch (error) {
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
    address: string,
    network: INetwork
  ): Promise<object | undefined> => {
    try {
      const { chainId, label } = network;

      let apiBaseUrl = '';

      chainId !== 1
        ? (apiBaseUrl = `https://api-${label.toLowerCase()}.etherscan.io/`)
        : 'https://api.etherscan.io/';

      const { data } = await axios.get(
        `${apiBaseUrl}api?module=account&action=tokennfttx&address=${address}&page=1&offset=100&&startblock=0&endblock=27025780&sort=asc&apikey=K46SB2PK5E3T6TZC81V1VK61EFQGMU49KA`
      );

      if (data.message === 'OK' && data.result !== []) {
        return data.result;
      }

      return;
    } catch (error) {
      throw new Error(`No NFTs available for this address. Error: ${error}`);
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
      throw new Error(`Not available tokens. Error: ${error}`);
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
      throw new Error(`Can't import account. Error: ${error}`);
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
      console.error(error);
    }
  };

  const getTransactionCount = async (address: string) =>
    await web3Provider.eth.getTransactionCount(address);

  const ethSignTypedDataV4 = (msgParams: object) => {
    const msg = JSON.stringify(msgParams);
    const provider = window.pali.getProvider('ethereum');

    const from = provider.selectedAddress;

    const params = [from, msg];
    const method = 'ethSignTypedDataV4';

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

  const getData = ({
    contractAddress,
    receivingAddress,
    value,
  }: {
    contractAddress: string;
    receivingAddress: string;
    value: any;
  }) => {
    const abi = getErc20Abi() as any;
    const contract = new web3Provider.eth.Contract(abi, contractAddress);
    const data = contract.methods.transfer(receivingAddress, value).encodeABI();

    return data;
  };

  const sendTransaction = async ({
    sender,
    senderXprv,
    receivingAddress,
    amount,
    gasLimit,
    gasPrice,
    token,
  }: {
    sender: string;
    senderXprv: string;
    receivingAddress: string;
    amount: number;
    gasLimit?: number;
    gasPrice?: number;
    token?: any;
  }): Promise<TransactionReceipt> => {
    const tokenDecimals = token && token.decimals ? token.decimals : 18;
    const decimals = web3Provider.utils.toBN(tokenDecimals);
    const amountBN = web3Provider.utils.toBN(amount);

    const defaultGasPrice = await getRecommendedGasPrice(false);
    const defaultGasLimit = await getGasLimit(receivingAddress);

    const value =
      token && token.contract_address
        ? amountBN.mul(web3Provider.utils.toBN(10).pow(decimals))
        : web3Provider.utils.toWei(amount.toString(), 'ether');

    const data =
      token && token.contract_address
        ? getData({
            contractAddress: token.contract_address,
            receivingAddress,
            value,
          })
        : null;

    if (token && token.contract_address) {
      const signedTokenTransaction =
        await web3Provider.eth.accounts.signTransaction(
          {
            from: sender,
            to: token.contract_address,
            value: '0x00',
            gas: gasLimit || defaultGasLimit,
            gasPrice: gasPrice || defaultGasPrice,
            nonce: await web3Provider.eth.getTransactionCount(sender, 'latest'),
            data,
          },
          senderXprv
        );

      return web3Provider.eth
        .sendSignedTransaction(`${signedTokenTransaction.rawTransaction}`)
        .then((result: TransactionReceipt) => result);
    }

    const signedTransaction = await web3Provider.eth.accounts.signTransaction(
      {
        from: sender,
        to: receivingAddress,
        value,
        gas: gasLimit || defaultGasLimit,
        gasPrice: gasPrice || defaultGasPrice,
        nonce: await web3Provider.eth.getTransactionCount(sender, 'latest'),
        data,
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
    ethSignTypedDataV4,
    sendTransaction,
    getFeeByType,
    getGasLimit,
    getRecommendedGasPrice,
    getGasOracle,
  };

  return {
    createAccount,
    getBalance,
    getBalanceOfAnyToken,
    getTokens,
    getNftsByAddress,
    importAccount,
    getUserTransactions,
    tx,
  };
};
