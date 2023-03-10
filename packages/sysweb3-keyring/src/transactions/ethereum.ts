// import { ecsign, toBuffer, stripHexPrefix, hashPersonalMessage, toAscii } from '@ethereumjs/util';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { Chain, chains } from 'eth-chains';
import {
  concatSig,
  decrypt,
  SignedMsgParams,
  signTypedMessage,
  TypedMessage,
  Version,
  TypedData,
  getEncryptionPublicKey,
  recoverPersonalSignature,
  recoverTypedMessage,
  EthEncryptedData,
} from 'eth-sig-util';
import {
  ecsign,
  toBuffer,
  stripHexPrefix,
  hashPersonalMessage,
  toAscii,
} from 'ethereumjs-util';
import { ethers } from 'ethers';
import { Deferrable } from 'ethers/lib/utils';
import floor from 'lodash/floor';

import { getFormattedTransactionResponse } from '../format';
import { getDecryptedVault } from '../storage';
import {
  IEthereumTransactions,
  IResponseFromSendErcSignedTransaction,
  ISendSignedErcTransactionProps,
  ISendTransaction,
  SimpleTransactionRequest,
} from '../types';
import { sysweb3Di } from '@pollum-io/sysweb3-core';
import {
  createContractUsingAbi,
  getErc20Abi,
  getErc21Abi,
  getTokenStandardMetadata,
  INetwork,
} from '@pollum-io/sysweb3-utils';
import { web3Provider } from '@pollum-io/sysweb3-network';

export const EthereumTransactions = (): IEthereumTransactions => {
  const storage = sysweb3Di.getStateStorageDb();

  const getDecryptedPrivateKey = () => {
    const { wallet } = getDecryptedVault();
    const { hash } = storage.get('vault-keys');
    const { activeAccountId } = wallet;

    const accountXprv = wallet.accounts[activeAccountId].xprv;

    const decryptedPrivateKey = CryptoJS.AES.decrypt(
      accountXprv,
      hash
    ).toString(CryptoJS.enc.Utf8);

    return {
      address: wallet.accounts[activeAccountId].address,
      decryptedPrivateKey,
    };
  };

  const signTypedData = (
    addr: string,
    typedData: TypedData | TypedMessage<any>,
    version: Version
  ) => {
    const { address, decryptedPrivateKey } = getDecryptedPrivateKey();

    if (addr.toLowerCase() !== address.toLowerCase())
      throw {
        message: 'Decrypting for wrong address, change activeAccount maybe',
      };

    const privKey = Buffer.from(stripHexPrefix(decryptedPrivateKey), 'hex');
    return signTypedMessage(privKey, { data: typedData }, version);
  };

  const verifyTypedSignature = (
    data: TypedData | TypedMessage<any>,
    signature: string,
    version: Version
  ) => {
    try {
      const msgParams: SignedMsgParams<TypedData | TypedMessage<any>> = {
        data,
        sig: signature,
      };
      return recoverTypedMessage(msgParams, version);
    } catch (error) {
      throw error;
    }
  };

  const ethSign = (params: string[]) => {
    const { address, decryptedPrivateKey } = getDecryptedPrivateKey();

    let msg = '';
    //Comparisions do not need to care for checksum address
    if (params[0].toLowerCase() === address.toLowerCase()) {
      msg = stripHexPrefix(params[1]);
    } else if (params[1].toLowerCase() === address.toLowerCase()) {
      msg = stripHexPrefix(params[0]);
    } else {
      throw { msg: 'Signing for wrong address' };
    }

    try {
      const bufPriv = toBuffer(decryptedPrivateKey);
      const msgHash = Buffer.from(msg, 'hex');
      const sig = ecsign(msgHash, bufPriv);
      const resp = concatSig(toBuffer(sig.v), sig.r, sig.s);
      return resp;
    } catch (error) {
      throw error;
    }
  };

  const signPersonalMessage = (params: string[]) => {
    const { address, decryptedPrivateKey } = getDecryptedPrivateKey();
    let msg = '';

    if (params[0].toLowerCase() === address.toLowerCase()) {
      msg = params[1];
    } else if (params[1].toLowerCase() === address.toLowerCase()) {
      msg = params[0];
    } else {
      throw { msg: 'Signing for wrong address' };
    }

    try {
      const privateKey = toBuffer(decryptedPrivateKey);
      const message = toBuffer(msg);
      const msgHash = hashPersonalMessage(message);
      const sig = ecsign(msgHash, privateKey);
      const serialized = concatSig(toBuffer(sig.v), sig.r, sig.s);
      return serialized;
    } catch (error) {
      throw error;
    }
  };

  const parsePersonalMessage = (hexMsg: string) => {
    try {
      return toAscii(hexMsg);
    } catch (error) {
      throw error;
    }
  };

  const verifyPersonalMessage = (message: string, sign: string) => {
    try {
      const msgParams: SignedMsgParams<string> = {
        data: message,
        sig: sign,
      };
      return recoverPersonalSignature(msgParams);
    } catch (error) {
      throw error;
    }
  };

  const getEncryptedPubKey = () => {
    const { decryptedPrivateKey } = getDecryptedPrivateKey();

    try {
      return getEncryptionPublicKey(stripHexPrefix(decryptedPrivateKey));
    } catch (error) {
      throw error;
    }
  };

  // eth_decryptMessage
  const decryptMessage = (msgParams: string[]) => {
    const { address, decryptedPrivateKey } = getDecryptedPrivateKey();

    let encryptedData = '';
    if (msgParams[0].toLowerCase() === address.toLowerCase()) {
      encryptedData = msgParams[1];
    } else if (msgParams[1].toLowerCase() === address.toLowerCase()) {
      encryptedData = msgParams[0];
    } else {
      throw { msg: 'Decrypting for wrong receiver' };
    }
    encryptedData = stripHexPrefix(encryptedData);

    try {
      const buff = Buffer.from(encryptedData, 'hex');
      const cleanData: EthEncryptedData = JSON.parse(buff.toString('utf8'));
      const sig = decrypt(cleanData, stripHexPrefix(decryptedPrivateKey));
      return sig;
    } catch (error) {
      throw error;
    }
  };

  const toBigNumber = (aBigNumberish: string | number) =>
    ethers.BigNumber.from(String(aBigNumberish));

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
    try {
      const contract = createContractUsingAbi(abi, contractAddress);
      const data = contract.methods
        .transfer(receivingAddress, value)
        .encodeABI();

      return data;
    } catch (error) {
      throw error;
    }
  };

  const getFeeDataWithDynamicMaxPriorityFeePerGas = async () => {
    let maxFeePerGas = toBigNumber(0);
    let maxPriorityFeePerGas = toBigNumber(0);

    try {
      const [block, ethMaxPriorityFee] = await Promise.all([
        await web3Provider.getBlock('latest'),
        await web3Provider.send('eth_maxPriorityFeePerGas', []),
      ]);

      if (block && block.baseFeePerGas) {
        maxPriorityFeePerGas = ethers.BigNumber.from(ethMaxPriorityFee);

        if (maxPriorityFeePerGas) {
          maxFeePerGas = block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas);
        }
      }

      return { maxFeePerGas, maxPriorityFeePerGas };
    } catch (error) {
      throw error;
    }
  };

  const sendFormattedTransaction = async (params: SimpleTransactionRequest) => {
    const { network } = getDecryptedVault();
    const { decryptedPrivateKey } = getDecryptedPrivateKey();

    const tx: Deferrable<ethers.providers.TransactionRequest> = params;
    const wallet = new ethers.Wallet(decryptedPrivateKey, web3Provider);
    try {
      const transaction = await wallet.sendTransaction(tx);

      return await getFormattedTransactionResponse(
        web3Provider,
        transaction,
        network
      );
    } catch (error) {
      throw error;
    }
  };
  // tip numerador eip 1559
  const sendTransaction = async ({
    sender,
    receivingAddress,
    amount,
    gasLimit,
    token,
  }: ISendTransaction): Promise<TransactionResponse> => {
    const tokenDecimals = token && token.decimals ? token.decimals : 18;
    const decimals = toBigNumber(tokenDecimals);

    const parsedAmount = ethers.utils.parseEther(String(amount));

    const { decryptedPrivateKey } = getDecryptedPrivateKey();

    const { network } = getDecryptedVault();

    const wallet = new ethers.Wallet(decryptedPrivateKey, web3Provider);

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

    // gas price, gas limit e maxPriorityFeePerGas (tip)
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

      return await getFormattedTransactionResponse(
        web3Provider,
        transaction,
        network
      );
    } catch (error) {
      throw error;
    }
  };

  const sendSignedErc20Transaction = async ({
    networkUrl,
    receiver,
    tokenAddress,
    tokenAmount,
    maxPriorityFeePerGas,
    maxFeePerGas,
    gasLimit,
  }: ISendSignedErcTransactionProps): Promise<IResponseFromSendErcSignedTransaction> => {
    const provider = new ethers.providers.JsonRpcProvider(networkUrl);

    const { decryptedPrivateKey } = getDecryptedPrivateKey();

    const currentWallet = new ethers.Wallet(decryptedPrivateKey);

    const walletSigned = currentWallet.connect(provider);

    try {
      const _contract = new ethers.Contract(
        tokenAddress,
        getErc20Abi(),
        walletSigned
      );

      const calculatedTokenAmount = ethers.BigNumber.from(
        ethers.utils.parseEther(tokenAmount as string)
      );

      const transferMethod = await _contract.transfer(
        receiver,
        calculatedTokenAmount,
        {
          nonce: await provider.getTransactionCount(
            walletSigned.address,
            'pending'
          ),
          maxPriorityFeePerGas,
          maxFeePerGas,
          gasLimit,
        }
      );

      return transferMethod;
    } catch (error) {
      throw error;
    }
  };

  const sendSignedErc721Transaction = async ({
    networkUrl,
    receiver,
    tokenAddress,
    tokenId,
  }: ISendSignedErcTransactionProps): Promise<IResponseFromSendErcSignedTransaction> => {
    const provider = new ethers.providers.JsonRpcProvider(networkUrl);

    const { decryptedPrivateKey } = getDecryptedPrivateKey();

    const currentWallet = new ethers.Wallet(decryptedPrivateKey);

    const walletSigned = currentWallet.connect(provider);

    try {
      const _contract = new ethers.Contract(
        tokenAddress,
        getErc21Abi(),
        walletSigned
      );

      const transferMethod = await _contract.transferFrom(
        walletSigned.address,
        receiver,
        tokenId as number,
        {
          nonce: await provider.getTransactionCount(
            walletSigned.address,
            'pending'
          ),
        }
      );

      return transferMethod;
    } catch (error) {
      throw error;
    }
  };

  //todo: need to receive activeNetwork and web3Provider<MAYBE>?
  const getRecommendedNonce = async (address: string) => {
    try {
      return await web3Provider.getTransactionCount(address, 'pending');
    } catch (error) {
      throw error;
    }
  };

  const getFeeByType = async (type: string) => {
    const gasPrice = (await getRecommendedGasPrice(false)) as string;

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
    try {
      const estimated = await web3Provider.estimateGas({
        to: toAddress,
      });

      return Number(ethers.utils.formatUnits(estimated, 'gwei'));
    } catch (error) {
      throw error;
    }
  };

  const getTxGasLimit = async (tx: SimpleTransactionRequest) => {
    try {
      return web3Provider.estimateGas(tx);
    } catch (error) {
      throw error;
    }
  };

  const getRecommendedGasPrice = async (formatted?: boolean) => {
    try {
      const gasPriceBN = await web3Provider.getGasPrice();

      if (formatted) {
        return {
          gwei: Number(ethers.utils.formatUnits(gasPriceBN, 'gwei')).toFixed(2),
          ethers: ethers.utils.formatEther(gasPriceBN),
        };
      }

      return gasPriceBN.toString();
    } catch (error) {
      throw error;
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

  const getBalance = async (address: string) => {
    try {
      const balance = await web3Provider.getBalance(address);
      const formattedBalance = ethers.utils.formatEther(balance);

      const roundedBalance = floor(parseFloat(formattedBalance), 4);

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
      //todo: import floor from lodash/floor
      const roundedBalance = floor(parseFloat(formattedBalance), 4);

      return roundedBalance;
    } catch (error) {
      return 0;
    }
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
          balance: ethers.utils.formatEther(details.balance),
        });
      })
    );

    return tokens;
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

    const { chainId, default: _default, label, apiUrl } = network;

    const networkByLabel = chainId === 1 ? 'homestead' : label.toLowerCase();

    //todo how to handle here?
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
              await getFormattedTransactionResponse(
                etherscanProvider,
                tx,
                network
              )
          )
        );

        return [...pendingTransactions, ...history] || [...pendingTransactions];
      }

      const query = `?module=account&action=txlist&address=${address}`;

      const {
        data: { result },
      } = await axios.get(`${apiUrl}${query}`);

      if (typeof result !== 'string') {
        const txs = await Promise.all(
          result.map(
            async (tx: TransactionResponse) =>
              await getFormattedTransactionResponse(web3Provider, tx, network)
          )
        );

        return [...pendingTransactions, ...txs];
      }
    }

    return [...pendingTransactions];
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
      throw error;
    });

    const pendingTransactions: TransactionResponse[] = [];

    //TODO: the issue with the test is here
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

  return {
    ethSign,
    signPersonalMessage,
    parsePersonalMessage,
    signTypedData,
    decryptMessage,
    verifyPersonalMessage,
    verifyTypedSignature,
    getEncryptedPubKey,
    sendTransaction,
    sendFormattedTransaction,
    getFeeByType,
    getRecommendedNonce,
    getGasLimit,
    getTxGasLimit,
    getRecommendedGasPrice,
    getGasOracle,
    getFeeDataWithDynamicMaxPriorityFeePerGas,
    toBigNumber,
    sendSignedErc20Transaction,
    sendSignedErc721Transaction,
    getBalance,
    getErc20TokenBalance,
    getErc20TokensByAddress,
    getUserTransactions,
  };
};
