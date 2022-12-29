// import { ecsign, toBuffer, stripHexPrefix, hashPersonalMessage, toAscii } from '@ethereumjs/util';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import axios from 'axios';
import CryptoJS from 'crypto-js';
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

import { getFormattedTransactionResponse } from '../format';
import {
  IEthereumTransactions,
  ISendTransaction,
  SimpleTransactionRequest,
} from '../types';
import { sysweb3Di } from '@pollum-io/sysweb3-core';
import { web3Provider } from '@pollum-io/sysweb3-network';
import {
  createContractUsingAbi,
  getDecryptedVault,
  getErc20Abi,
} from '@pollum-io/sysweb3-utils';

export const EthereumTransactions = (): IEthereumTransactions => {
  const storage = sysweb3Di.getStateStorageDb();

  const getTransactionCount = async (address: string) =>
    await web3Provider.getTransactionCount(address);

  const signTypedData = (
    addr: string,
    typedData: TypedData | TypedMessage<any>,
    version: Version
  ) => {
    const { wallet } = getDecryptedVault();
    const { hash } = storage.get('vault-keys');

    const accountXprv = wallet.activeAccount.xprv;
    const address = wallet.activeAccount.address;
    if (addr.toLowerCase() !== address.toLowerCase())
      throw {
        message: 'Decrypting for wrong address, change activeAccount maybe',
      };
    const decryptedPrivateKey = CryptoJS.AES.decrypt(
      accountXprv,
      hash
    ).toString(CryptoJS.enc.Utf8);
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
      throw new Error(error);
    }
  };

  const ethSign = (params: string[]) => {
    const { wallet } = getDecryptedVault();
    const { hash } = storage.get('vault-keys');

    const accountXprv = wallet.activeAccount.xprv;
    const address = wallet.activeAccount.address;
    const decryptedPrivateKey = CryptoJS.AES.decrypt(
      accountXprv,
      hash
    ).toString(CryptoJS.enc.Utf8);
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
      throw new Error(error);
    }
  };

  const signPersonalMessage = (params: string[]) => {
    const { wallet } = getDecryptedVault();
    const { hash } = storage.get('vault-keys');

    const accountXprv = wallet.activeAccount.xprv;
    const address = wallet.activeAccount.address;
    const decryptedPrivateKey = CryptoJS.AES.decrypt(
      accountXprv,
      hash
    ).toString(CryptoJS.enc.Utf8);
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
      throw new Error(error);
    }
  };

  const parsePersonalMessage = (hexMsg: string) => {
    try {
      return toAscii(hexMsg);
    } catch (error) {
      throw new Error(error);
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
      throw new Error(error);
    }
  };

  const getEncryptedPubKey = () => {
    const { wallet } = getDecryptedVault();
    const { hash } = storage.get('vault-keys');
    const accountXprv = wallet.activeAccount.xprv;
    const decryptedPrivateKey = CryptoJS.AES.decrypt(
      accountXprv,
      hash
    ).toString(CryptoJS.enc.Utf8);

    try {
      return getEncryptionPublicKey(stripHexPrefix(decryptedPrivateKey));
    } catch (error) {
      throw new Error(error);
    }
  };

  // eth_decryptMessage
  const decryptMessage = (msgParams: string[]) => {
    const { wallet } = getDecryptedVault();
    const { hash } = storage.get('vault-keys');

    const accountXprv = wallet.activeAccount.xprv;
    const address = wallet.activeAccount.address;
    let encryptedData = '';
    if (msgParams[0].toLowerCase() === address.toLowerCase()) {
      encryptedData = msgParams[1];
    } else if (msgParams[1].toLowerCase() === address.toLowerCase()) {
      encryptedData = msgParams[0];
    } else {
      throw { msg: 'Decrypting for wrong receiver' };
    }
    encryptedData = stripHexPrefix(encryptedData);
    const decryptedPrivateKey = CryptoJS.AES.decrypt(
      accountXprv,
      hash
    ).toString(CryptoJS.enc.Utf8);

    try {
      const buff = Buffer.from(encryptedData, 'hex');
      const cleanData: EthEncryptedData = JSON.parse(buff.toString('utf8'));
      const sig = decrypt(cleanData, stripHexPrefix(decryptedPrivateKey));
      return sig;
    } catch (error) {
      throw new Error(error);
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
      throw new Error(error);
    }
  };

  const getFeeDataWithDynamicMaxPriorityFeePerGas = async () => {
    let maxFeePerGas = toBigNumber(0);
    let maxPriorityFeePerGas = toBigNumber(0);

    const provider = web3Provider;

    try {
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
    } catch (error) {
      throw new Error(error);
    }
  };

  const sendFormattedTransaction = async (params: SimpleTransactionRequest) => {
    const { wallet: _wallet } = getDecryptedVault();
    const { hash } = storage.get('vault-keys');

    const accountXprv = _wallet.activeAccount.xprv;

    const decryptedPrivateKey = CryptoJS.AES.decrypt(
      accountXprv,
      hash
    ).toString(CryptoJS.enc.Utf8);
    const tx: Deferrable<ethers.providers.TransactionRequest> = params;
    const wallet = new ethers.Wallet(decryptedPrivateKey, web3Provider);
    try {
      const transaction = await wallet.sendTransaction(tx);

      return await getFormattedTransactionResponse(web3Provider, transaction);
    } catch (error) {
      throw new Error(error);
    }
  };

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

    const { wallet: _wallet } = getDecryptedVault();
    const { hash } = storage.get('vault-keys');

    const accountXprv = _wallet.activeAccount.xprv;

    const decryptedPrivateKey = CryptoJS.AES.decrypt(
      accountXprv,
      hash
    ).toString(CryptoJS.enc.Utf8);

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
  const getRecommendedNonce = async (address: string) => {
    try {
      return await web3Provider.getTransactionCount(address, 'pending');
    } catch (error) {
      throw new Error(error);
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
      throw new Error(error);
    }
  };

  const getTxGasLimit = async (tx: SimpleTransactionRequest) => {
    try {
      return web3Provider.estimateGas(tx);
    } catch (error) {
      throw new Error(error);
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

  return {
    getTransactionCount,
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
  };
};
