import { TransactionResponse } from '@ethersproject/abstract-provider';
import axios from 'axios';
import * as sigUtil from 'eth-sig-util';
import * as ethUtil from 'ethereumjs-util';
import { ethers } from 'ethers';
import { request, gql } from 'graphql-request';
import _ from 'lodash';

import { web3Provider } from '@pollum-io/sysweb3-network';
import {
  createContractUsingAbi,
  getErc20Abi,
  INetwork,
} from '@pollum-io/sysweb3-utils';

export const Web3Accounts = () => {
  const createAccount = (privateKey: string) => new ethers.Wallet(privateKey);

  const getBalance = async (address: string): Promise<number> => {
    try {
      const balance = await web3Provider.getBalance(address);
      const formattedBalance = ethers.utils.formatEther(balance);

      const roundedBalance = _.floor(parseFloat(formattedBalance), 4);

      return roundedBalance;
    } catch (error) {
      throw new Error(`No balance available for this address. Error: ${error}`);
    }
  };

  const getBalanceOfAnyToken = async (
    tokenAddress: string,
    walletAddress: string
  ): Promise<number> => {
    try {
      const abi = getErc20Abi() as any;
      const balance = createContractUsingAbi(abi, tokenAddress)
        .methods.balanceOf(walletAddress)
        .call();

      const formattedBalance = ethers.utils.formatEther(balance);
      const roundedBalance = _.floor(parseFloat(formattedBalance), 4);

      return roundedBalance;
    } catch (error) {
      return 0;
    }
  };

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

  const importAccount = (mnemonic: string) => {
    try {
      if (ethers.utils.isHexString(mnemonic)) {
        return new ethers.Wallet(mnemonic);
      }

      const { privateKey } = ethers.Wallet.fromMnemonic(mnemonic);

      const account = new ethers.Wallet(privateKey);

      return account;
    } catch (error) {
      throw new Error(`Can't import account. Error: ${error}`);
    }
  };

  // const checkLatestBlocksForTransactions = async (
  //   address: string,
  //   transactions: any[]
  // ) => {
  //   const currentBlock = web3Provider.blockNumber;

  //   let txCount = await web3Provider.getTransactionCount(address, currentBlock);
  //   let balance = await web3Provider.getBalance(address, currentBlock);

  //   if (txCount > 0 || balance) {
  //     const blockTxs: any = {};

  //     for (
  //       let index = currentBlock;
  //       index >= 10000 && txCount > 0 && balance;
  //       --index
  //     ) {
  //       try {
  //         const block = await web3Provider.getBlock(index);

  //         if (block && block.transactions) {
  //           blockTxs[block.hash] = block.transactions;
  //         }

  //         const currentTx = blockTxs[block.hash];

  //         if (
  //           (currentTx && currentTx.from === address) ||
  //           currentTx.to === address
  //         ) {
  //           if (address === currentTx.from) {
  //             if (currentTx.from !== currentTx.to)
  //               balance = balance.add(currentTx.value);

  //             console.log({
  //               index,
  //               tx,
  //               from: currentTx.from,
  //               to: currentTx.to,
  //               value: currentTx.value.toString(10),
  //             });

  //             txCount = txCount - 1;
  //           }

  //           if (address == currentTx.to) {
  //             if (currentTx.from !== currentTx.to)
  //               balance = balance.sub(currentTx.value);

  //             console.log({
  //               index,
  //               tx,
  //               from: currentTx.from,
  //               to: currentTx.to,
  //               value: currentTx.value.toString(10),
  //             });
  //           }

  //           transactions.push(currentTx);
  //         }
  //       } catch (error) {
  //         throw new Error(`Error in block. Error: ${error}`);
  //       }
  //     }
  //   }
  // };

  const getUserTransactions = async (address: string, network: INetwork) => {
    const etherscanSupportedNetworks = [
      'ethereum mainnet',
      'ropsten',
      'rinkeby',
      'goerli',
      'kovan',
    ];

    try {
      if (etherscanSupportedNetworks.includes(network.label)) {
        const etherscanProvider = new ethers.providers.EtherscanProvider(
          network.label,
          'K46SB2PK5E3T6TZC81V1VK61EFQGMU49KA'
        );

        return etherscanProvider.getHistory(address) || [];
      }

      // const wssProvider = new ethers.providers.WebSocketProvider(
      //   String(network.wsUrl)
      // );

      // console.log({ wssProvider });

      // const transactions: any = {};

      // wssProvider.on('pending', async (txhash) => {
      //   const tx = await wssProvider.getTransaction(txhash);

      //   console.log('pending tx is not ours', { tx, transactions });

      //   if (tx.from === address || tx.to === address) {
      //     transactions[tx.hash] = tx;

      //     console.log('pending tx is ours', { tx, transactions });
      //   }
      // });

      // await checkLatestBlocksForTransactions(address, transactions);

      // return Object.values(transactions);

      if (network.chainId === 57) {
        const request = await axios.get(
          `https://explorer.syscoin.org/api?module=account&action=txlist&address=${address}`
        );

        console.log({ request, network });

        return request.data.result;
      }

      if (network.chainId === 5700) {
        const request = await axios.get(
          `https://tanenbaum.io/api?module=account&action=txlist&address=${address}`
        );

        console.log({ request, network });

        return request.data.result;
      }

      return [];
    } catch (error) {
      throw new Error(
        `Could not get user transactions history. Error: ${error}`
      );
    }
  };

  const getTransactionCount = async (address: string) =>
    await web3Provider.getTransactionCount(address);

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
    const gasPriceBN = await web3Provider.getGasPrice();

    if (formatted) {
      return ethers.utils.formatEther(gasPriceBN);
    }

    return gasPriceBN.toString();
  };

  const toBigNumber = (aBigNumberish: string) =>
    ethers.BigNumber.from(String(aBigNumberish));

  const getFeeByType = async (type: string) => {
    const gasPrice = await getRecommendedGasPrice(false);

    const low = toBigNumber(gasPrice)
      .mul(ethers.BigNumber.from('8'))
      .div(ethers.BigNumber.from('10'))
      .toString();

    const high = toBigNumber(gasPrice)
      .mul(ethers.BigNumber.from('11'))
      .div(ethers.BigNumber.from('10'))
      .toString();

    if (type === 'low') return low;
    if (type === 'high') return high;

    return gasPrice;
  };

  const getGasLimit = async (toAddress: string) => {
    return await web3Provider.estimateGas({
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
    const contract = createContractUsingAbi(abi, contractAddress);
    const data = contract.methods.transfer(receivingAddress, value).encodeABI();

    return data;
  };

  const sendTransaction = async ({
    sender,
    receivingAddress,
    amount,
    gasLimit,
    gasPrice,
    token,
  }: {
    sender: string;
    receivingAddress: string;
    amount: number;
    gasLimit?: number;
    gasPrice?: number;
    token?: any;
  }): Promise<TransactionResponse> => {
    const tokenDecimals = token && token.decimals ? token.decimals : 18;
    const decimals = toBigNumber(tokenDecimals);
    const amountBN = toBigNumber(String(amount));

    const defaultGasPrice = await getRecommendedGasPrice(false);
    const defaultGasLimit = await getGasLimit(receivingAddress);

    const value =
      token && token.contract_address
        ? amountBN.mul(toBigNumber('10').pow(decimals))
        : ethers.utils.formatEther(amount.toString());

    const data =
      token && token.contract_address
        ? getData({
            contractAddress: token.contract_address,
            receivingAddress,
            value,
          })
        : null;

    const signer = web3Provider.getSigner();

    if (token && token.contract_address) {
      const tx = {
        from: sender,
        to: token.contract_address,
        value: '0x00',
        gas: gasLimit || defaultGasLimit,
        gasPrice: gasPrice || defaultGasPrice,
        nonce: await web3Provider.getTransactionCount(sender, 'latest'),
        data,
      };

      const signedTokenTransaction = await signer.signTransaction(tx);

      return web3Provider.sendTransaction(signedTokenTransaction);
    }

    const tx = {
      from: sender,
      to: receivingAddress,
      value,
      gas: gasLimit || defaultGasLimit,
      gasPrice: gasPrice || defaultGasPrice,
      nonce: await web3Provider.getTransactionCount(sender, 'latest'),
      data,
    };

    const signedTokenTransaction = await signer.signTransaction(tx);

    try {
      return web3Provider.sendTransaction(signedTokenTransaction);
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
