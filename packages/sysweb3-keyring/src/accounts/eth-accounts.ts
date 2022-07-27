import { TransactionResponse } from '@ethersproject/abstract-provider';
import axios from 'axios';
import { chains } from 'eth-chains';
import * as sigUtil from 'eth-sig-util';
import * as ethUtil from 'ethereumjs-util';
import { ethers } from 'ethers';
import { Deferrable } from 'ethers/lib/utils';
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

  const checkLatestBlocksForTransactions = async (address: string) => {
    const currentBlock = web3Provider.blockNumber;

    let txCount = await web3Provider.getTransactionCount(address, currentBlock);
    let balance = await web3Provider.getBalance(address, currentBlock);

    const transactions = [];

    if (txCount > 0 || balance) {
      for (
        let index = currentBlock;
        index >= 100 && txCount > 0 && balance;
        --index
      ) {
        try {
          const block = await web3Provider.getBlock(index);

          if (block && block.transactions) {
            for (const hash of block.transactions) {
              const transaction = await web3Provider.getTransaction(hash);

              if (transaction.from === address) {
                balance = balance.add(transaction.value);

                console.log({
                  transaction,
                  address,
                  hash,
                });

                txCount = txCount - 1;
              }

              if (transaction.to === address) {
                if (transaction.from !== transaction.to)
                  balance = balance.sub(transaction.value);

                console.log({
                  transaction,
                  address,
                  hash,
                });
              }

              transactions.push(transaction);
            }
          }
        } catch (error) {
          throw new Error(`Error in block. Error: ${error}`);
        }
      }
    }

    return transactions;
  };

  const getUserTransactions = async (address: string, network: INetwork) => {
    const etherscanSupportedNetworks = [
      'homestead',
      'ropsten',
      'rinkeby',
      'goerli',
      'kovan',
    ];

    try {
      const { chainId, default: _default, label, apiUrl, url } = network;

      const chain = chains.getById(chainId);

      if (_default) {
        const networkByLabel =
          chainId === 1 ? 'homestead' : label.toLowerCase();

        if (etherscanSupportedNetworks.includes(networkByLabel)) {
          const etherscanProvider = new ethers.providers.EtherscanProvider(
            networkByLabel,
            'K46SB2PK5E3T6TZC81V1VK61EFQGMU49KA'
          );

          return etherscanProvider.getHistory(address) || [];
        }

        const query = `?module=account&action=txlist&address=${address}`;

        const {
          data: { result },
        } = await axios.get(`${apiUrl}${query}`);

        console.log({ network, result, chain });

        return result;
      }

      const wsUrl = chain
        ? chain.rpc.find((rpc: string) => rpc.startsWith('wss://'))
        : url;

      const wssProvider = new ethers.providers.WebSocketProvider(String(wsUrl));

      const pendingTransactions: any = {};

      wssProvider.on('pending', async (txhash: string) => {
        const tx = await wssProvider.getTransaction(txhash);

        if (tx.from === address || tx.to === address) {
          pendingTransactions[tx.hash] = tx;
        }
      });

      const transactions = await checkLatestBlocksForTransactions(address);

      console.log({ transactions, address, network, pendingTransactions });

      return Object.values(pendingTransactions);
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

  const toBigNumber = (aBigNumberish: string | number) =>
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

  const getFeeDataWithDynamicMaxPriorityFeePerGas = async () => {
    let maxFeePerGas = toBigNumber(0);
    let maxPriorityFeePerGas = toBigNumber(0);

    const provider = web3Provider;

    const [block, ethMaxPriorityFee] = await Promise.all([
      await provider.getBlock('latest'),
      await provider.send('eth_maxPriorityFeePerGas', []),
    ]);

    if (block && block.baseFeePerGas) {
      maxPriorityFeePerGas = ethers.BigNumber.from(ethMaxPriorityFee);

      if (maxPriorityFeePerGas) {
        maxFeePerGas = block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas);
      }
    }

    return { maxFeePerGas, maxPriorityFeePerGas };
  };

  const sendTransaction = async ({
    sender,
    receivingAddress,
    amount,
    gasLimit,
    gasPrice,
    token,
    senderXprv,
  }: {
    sender: string;
    receivingAddress: string;
    amount: number;
    gasLimit?: number;
    gasPrice?: number;
    token?: any;
    senderXprv: string;
  }): Promise<TransactionResponse> => {
    const tokenDecimals = token && token.decimals ? token.decimals : 18;
    const decimals = toBigNumber(tokenDecimals);

    const parsedAmount = ethers.utils.parseEther(String(amount));
    const wallet = new ethers.Wallet(senderXprv, web3Provider);

    const value =
      token && token.contract_address
        ? parsedAmount.mul(toBigNumber('10').pow(decimals))
        : parsedAmount;

    const data =
      token && token.contract_address
        ? getData({
            contractAddress: token.contract_address,
            receivingAddress,
            value,
          })
        : null;

    const { maxFeePerGas, maxPriorityFeePerGas } =
      await getFeeDataWithDynamicMaxPriorityFeePerGas();

    const tx: Deferrable<ethers.providers.TransactionRequest> = {
      to: receivingAddress,
      value,
      maxPriorityFeePerGas,
      maxFeePerGas,
      nonce: await web3Provider.getTransactionCount(sender, 'latest'),
      type: 2,
      chainId: web3Provider.network.chainId,
      gasLimit: toBigNumber(0) || gasLimit,
      data,
      gasPrice: gasPrice || undefined,
    };

    tx.gasLimit = await web3Provider.estimateGas(tx);

    try {
      return await wallet.sendTransaction(tx);
    } catch (error) {
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
