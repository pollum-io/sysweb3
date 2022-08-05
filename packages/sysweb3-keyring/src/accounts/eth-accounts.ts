import { TransactionResponse } from '@ethersproject/abstract-provider';
import axios from 'axios';
import { Chain, chains } from 'eth-chains';
import { recoverTypedSignature_v4 as recoverTypedSignatureV4 } from 'eth-sig-util';
import { toChecksumAddress } from 'ethereumjs-util';
import { ethers } from 'ethers';
import { Deferrable } from 'ethers/lib/utils';
import _ from 'lodash';

import {
  jsonRpcRequest,
  setActiveNetwork,
  web3Provider,
} from '@pollum-io/sysweb3-network';
import {
  createContractUsingAbi,
  getErc20Abi,
  getNftStandardMetadata,
  getTokenStandardMetadata,
  IEthereumNftDetails,
  IEtherscanNFT,
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
      return 0;
    }
  };

  const getErc20TokenBalance = async (
    tokenAddress: string,
    walletAddress: string
  ): Promise<number> => {
    try {
      const abi = getErc20Abi() as any;
      const balance = await createContractUsingAbi(abi, tokenAddress).balanceOf(
        walletAddress
      );

      const formattedBalance = ethers.utils.formatEther(balance);
      const roundedBalance = _.floor(parseFloat(formattedBalance), 4);

      return roundedBalance;
    } catch (error) {
      return 0;
    }
  };

  const getNftsByAddress = async (
    address: string,
    isSupported: boolean,
    apiUrl: string
  ) => {
    const etherscanQuery = `?module=account&action=tokennfttx&address=${address}&page=1&offset=100&&startblock=0&endblock=99999999&sort=asc&apikey=K46SB2PK5E3T6TZC81V1VK61EFQGMU49KA`;

    const apiUrlQuery = `?module=account&action=tokentx&address=${address}`;

    const query = isSupported ? etherscanQuery : apiUrlQuery;

    const {
      data: { result },
    } = await axios.get(`${apiUrl}${query}`);

    const nfts: IEthereumNftDetails[] = [];

    await Promise.all(
      result.map(async (nft: IEtherscanNFT) => {
        const isInTokensList =
          nfts.findIndex(
            (listedNft) => listedNft.contractAddress === nft.contractAddress
          ) > -1;

        if (isInTokensList) return;

        const details = await getNftStandardMetadata(
          nft.contractAddress,
          nft.tokenID,
          web3Provider
        );

        nfts.push({
          ...nft,
          ...details,
          isNft: true,
          id: nft.contractAddress,
        });
      })
    );

    return nfts;
  };

  const getErc20TokensByAddress = async (
    address: string,
    isSupported: boolean,
    apiUrl: string
  ) => {
    const etherscanQuery = `?module=account&action=tokentx&address=${address}&page=1&offset=100&&startblock=0&endblock=99999999&sort=asc&apikey=K46SB2PK5E3T6TZC81V1VK61EFQGMU49KA`;

    const apiUrlQuery = `?module=account&action=tokenlist&address=${address}`;

    const query = isSupported ? etherscanQuery : apiUrlQuery;

    const {
      data: { result },
    } = await axios.get(`${apiUrl}${query}`);

    const tokens: any[] = [];

    await Promise.all(
      result.map(async (token: any) => {
        const isInTokensList =
          tokens.findIndex(
            (listedToken) =>
              listedToken.contractAddress === token.contractAddress
          ) > -1;

        if (isInTokensList) return;

        const details = await getTokenStandardMetadata(
          token.contractAddress,
          address,
          web3Provider
        );

        tokens.push({
          ...token,
          ...details,
          isNft: false,
          id: token.contractAddress,
        });
      })
    );

    return tokens;
  };

  const getAssetsByAddress = async (
    address: string,
    network: INetwork
  ): Promise<IEthereumNftDetails[] | []> => {
    const etherscanSupportedNetworks = [
      'homestead',
      'ropsten',
      'rinkeby',
      'goerli',
      'kovan',
      'polygon',
      'mumbai',
    ];

    const tokensTransfers: any = [];

    try {
      const { chainId, label, apiUrl, url } = network;

      const networksLabels: { [chainId: number]: string } = {
        137: 'polygon',
        80001: 'mumbai',
        1: 'homestead',
      };

      const networkByLabel = networksLabels[chainId]
        ? networksLabels[chainId]
        : label.toLowerCase();

      const isSupported = etherscanSupportedNetworks.includes(networkByLabel);

      if (web3Provider.connection.url !== url) setActiveNetwork(network);

      const nfts = await getNftsByAddress(address, isSupported, String(apiUrl));
      const erc20Tokens = await getErc20TokensByAddress(
        address,
        isSupported,
        String(apiUrl)
      );

      const filter = {
        address,
        topics: [ethers.utils.id('Transfer(address,address,uint256)')],
      };

      web3Provider.on(filter, (transferToken) => {
        tokensTransfers.push(transferToken);
      });

      if (apiUrl) return [...nfts, ...erc20Tokens, ...tokensTransfers];

      return tokensTransfers;
    } catch (error) {
      return tokensTransfers;
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

  const getPendingTransactions = (
    chainId: number,
    address: string
  ): TransactionResponse[] => {
    const chain = chains.getById(chainId) as Chain;
    const chainWsUrl = chain.rpc.find((rpc) => rpc.startsWith('wss://'));

    const wsUrl = chain && chainWsUrl ? chainWsUrl : '';

    const needsApiKey = Boolean(wsUrl.includes('API_KEY'));

    const url = needsApiKey ? null : wsUrl;

    if (!url) return [];

    const wssProvider = new ethers.providers.WebSocketProvider(String(url));

    wssProvider.on('error', (error) => {
      console.error(`WS: Could not get pending transactions. ${error}`);

      return;
    });

    const pendingTransactions: TransactionResponse[] = [];

    wssProvider.on('pending', async (txhash) => {
      const tx = await wssProvider.getTransaction(txhash);

      const { from, to, hash, blockNumber } = tx;

      if (tx && (from === address || to === address)) {
        const { timestamp } = await wssProvider.getBlock(Number(blockNumber));

        const formattedTx = {
          ...tx,
          timestamp,
        };

        const isPendingTxIncluded =
          pendingTransactions.findIndex(
            (transaction: TransactionResponse) => transaction.hash === hash
          ) > -1;

        if (isPendingTxIncluded) return;

        pendingTransactions.push(formattedTx);
      }
    });

    return pendingTransactions;
  };

  const getFormattedTransactionResponse = async (
    provider:
      | ethers.providers.EtherscanProvider
      | ethers.providers.JsonRpcProvider,
    transaction: TransactionResponse
  ) => {
    const tx = await provider.getTransaction(transaction.hash);

    const { timestamp } = await provider.getBlock(Number(tx.blockNumber));

    return {
      ...tx,
      timestamp,
    };
  };

  const getUserTransactions = async (
    address: string,
    network: INetwork
  ): Promise<TransactionResponse[]> => {
    const etherscanSupportedNetworks = [
      'homestead',
      'ropsten',
      'rinkeby',
      'goerli',
      'kovan',
    ];

    try {
      const { chainId, default: _default, label, apiUrl } = network;

      const networkByLabel = chainId === 1 ? 'homestead' : label.toLowerCase();

      const pendingTransactions = getPendingTransactions(chainId, address);

      if (_default) {
        if (etherscanSupportedNetworks.includes(networkByLabel)) {
          const etherscanProvider = new ethers.providers.EtherscanProvider(
            networkByLabel,
            'K46SB2PK5E3T6TZC81V1VK61EFQGMU49KA'
          );

          const txHistory = await etherscanProvider.getHistory(address);

          const history = await Promise.all(
            txHistory.map(
              async (tx) =>
                await getFormattedTransactionResponse(etherscanProvider, tx)
            )
          );

          return (
            [...pendingTransactions, ...history] || [...pendingTransactions]
          );
        }

        const query = `?module=account&action=txlist&address=${address}`;

        const {
          data: { result },
        } = await axios.get(`${apiUrl}${query}`);

        const txs = await Promise.all(
          result.map(
            async (tx: TransactionResponse) =>
              await getFormattedTransactionResponse(web3Provider, tx)
          )
        );

        return [...pendingTransactions, ...txs];
      }

      return [...pendingTransactions];
    } catch (error) {
      return [];
    }
  };

  const getTransactionCount = async (address: string) =>
    await web3Provider.getTransactionCount(address);

  const signTypedDataV4 = async (
    msgParams: object,
    address: string,
    url: string
  ) => {
    const msg = JSON.stringify(msgParams);
    const params = [address, msg];

    const { error, result } = await jsonRpcRequest(
      url,
      'ethSignTypedDataV4',
      // @ts-ignore
      params
    );

    if (error) throw new Error(error);

    const recovered = recoverTypedSignatureV4({
      data: JSON.parse(msg),
      sig: result,
    });

    return {
      success: toChecksumAddress(recovered) === toChecksumAddress(address),
      result,
      recovered,
    };
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
    };

    tx.gasLimit = await web3Provider.estimateGas(tx);

    try {
      const transaction = await wallet.sendTransaction(tx);

      return await getFormattedTransactionResponse(web3Provider, transaction);
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
    signTypedDataV4,
    sendTransaction,
    getFeeByType,
    getGasLimit,
    getRecommendedGasPrice,
    getGasOracle,
  };

  return {
    createAccount,
    getBalance,
    getErc20TokenBalance,
    getErc20TokensByAddress,
    getNftsByAddress,
    getAssetsByAddress,
    importAccount,
    getUserTransactions,
    tx,
  };
};
