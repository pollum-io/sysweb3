import { TransactionResponse } from '@ethersproject/abstract-provider';
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

import {
  IResponseFromSendErcSignedTransaction,
  ISendSignedErcTransactionProps,
  ISendTransaction,
  IEthereumTransactions,
  SimpleTransactionRequest,
} from '../types';
import { INetwork } from '@pollum-io/sysweb3-network';
import {
  createContractUsingAbi,
  getErc20Abi,
  getErc21Abi,
} from '@pollum-io/sysweb3-utils';

export class EthereumTransactions implements IEthereumTransactions {
  public web3Provider: any;
  private getNetwork: () => INetwork;
  private getDecryptedPrivateKey: () => {
    address: string;
    decryptedPrivateKey: string;
  };

  constructor(
    getNetwork: () => INetwork,
    getDecryptedPrivateKey: () => {
      address: string;
      decryptedPrivateKey: string;
    }
  ) {
    this.getNetwork = getNetwork;
    this.getDecryptedPrivateKey = getDecryptedPrivateKey;
    this.web3Provider = new ethers.providers.JsonRpcProvider(
      this.getNetwork().url
    );
  }

  signTypedData = (
    addr: string,
    typedData: TypedData | TypedMessage<any>,
    version: Version
  ) => {
    const { address, decryptedPrivateKey } = this.getDecryptedPrivateKey();

    if (addr.toLowerCase() !== address.toLowerCase())
      throw {
        message: 'Decrypting for wrong address, change activeAccount maybe',
      };

    const privKey = Buffer.from(stripHexPrefix(decryptedPrivateKey), 'hex');
    return signTypedMessage(privKey, { data: typedData }, version);
  };

  verifyTypedSignature = (
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

  ethSign = (params: string[]) => {
    const { address, decryptedPrivateKey } = this.getDecryptedPrivateKey();

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

  signPersonalMessage = (params: string[]) => {
    const { address, decryptedPrivateKey } = this.getDecryptedPrivateKey();
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

  parsePersonalMessage = (hexMsg: string) => {
    try {
      return toAscii(hexMsg);
    } catch (error) {
      throw error;
    }
  };

  verifyPersonalMessage = (message: string, sign: string) => {
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

  getEncryptedPubKey = () => {
    const { decryptedPrivateKey } = this.getDecryptedPrivateKey();

    try {
      return getEncryptionPublicKey(stripHexPrefix(decryptedPrivateKey));
    } catch (error) {
      throw error;
    }
  };

  // eth_decryptMessage
  decryptMessage = (msgParams: string[]) => {
    const { address, decryptedPrivateKey } = this.getDecryptedPrivateKey();

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

  toBigNumber = (aBigNumberish: string | number) =>
    ethers.BigNumber.from(String(aBigNumberish));

  getData = ({
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

  getFeeDataWithDynamicMaxPriorityFeePerGas = async () => {
    let maxFeePerGas = this.toBigNumber(0);
    let maxPriorityFeePerGas = this.toBigNumber(0);

    try {
      const [block, ethMaxPriorityFee] = await Promise.all([
        await this.web3Provider.getBlock('latest'),
        await this.web3Provider.send('eth_maxPriorityFeePerGas', []),
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
  //TODO: This function needs to be refactored
  sendFormattedTransaction = async (params: SimpleTransactionRequest) => {
    const { decryptedPrivateKey } = this.getDecryptedPrivateKey();

    const tx: Deferrable<ethers.providers.TransactionRequest> = params;
    const wallet = new ethers.Wallet(decryptedPrivateKey, this.web3Provider);
    try {
      const transaction = await wallet.sendTransaction(tx);
      const response = await this.web3Provider.getTransaction(transaction.hash);
      //TODO: more precisely on this lines
      if (!response) {
        return await this.getTransactionTimestamp(transaction);
      } else {
        return await this.getTransactionTimestamp(response);
      }
    } catch (error) {
      throw error;
    }
  };
  // tip numerador eip 1559
  // TODO: refactor this function
  sendTransaction = async ({
    sender,
    receivingAddress,
    amount,
    gasLimit,
    token,
  }: ISendTransaction): Promise<TransactionResponse> => {
    const tokenDecimals = token && token.decimals ? token.decimals : 18;
    const decimals = this.toBigNumber(tokenDecimals);

    const parsedAmount = ethers.utils.parseEther(String(amount));

    const { decryptedPrivateKey } = this.getDecryptedPrivateKey();

    const wallet = new ethers.Wallet(decryptedPrivateKey, this.web3Provider);

    const value =
      token && token.contract_address
        ? parsedAmount.mul(this.toBigNumber('10').pow(decimals))
        : parsedAmount;

    const data =
      token && token.contract_address
        ? this.getData({
            contractAddress: token.contract_address,
            receivingAddress,
            value,
          })
        : null;

    // gas price, gas limit e maxPriorityFeePerGas (tip)
    const { maxFeePerGas, maxPriorityFeePerGas } =
      await this.getFeeDataWithDynamicMaxPriorityFeePerGas();

    const tx: Deferrable<ethers.providers.TransactionRequest> = {
      to: receivingAddress,
      value,
      maxPriorityFeePerGas,
      maxFeePerGas,
      nonce: await this.web3Provider.getTransactionCount(sender, 'latest'),
      type: 2,
      chainId: this.web3Provider.network.chainId,
      gasLimit: this.toBigNumber(0) || gasLimit,
      data,
    };

    tx.gasLimit = await this.web3Provider.estimateGas(tx);

    try {
      const transaction = await wallet.sendTransaction(tx);
      const response = await this.web3Provider.getTransaction(transaction.hash);
      if (!response) {
        return await this.getTransactionTimestamp(transaction);
      } else {
        return await this.getTransactionTimestamp(response);
      }
    } catch (error) {
      throw error;
    }
  };

  sendSignedErc20Transaction = async ({
    receiver,
    tokenAddress,
    tokenAmount,
    maxPriorityFeePerGas,
    maxFeePerGas,
    gasLimit,
  }: ISendSignedErcTransactionProps): Promise<IResponseFromSendErcSignedTransaction> => {
    const { decryptedPrivateKey } = this.getDecryptedPrivateKey();

    const currentWallet = new ethers.Wallet(decryptedPrivateKey);

    const walletSigned = currentWallet.connect(this.web3Provider);

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
          nonce: await this.web3Provider.getTransactionCount(
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

  sendSignedErc721Transaction = async ({
    receiver,
    tokenAddress,
    tokenId,
  }: ISendSignedErcTransactionProps): Promise<IResponseFromSendErcSignedTransaction> => {
    const { decryptedPrivateKey } = this.getDecryptedPrivateKey();

    const currentWallet = new ethers.Wallet(decryptedPrivateKey);

    const walletSigned = currentWallet.connect(this.web3Provider);

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
          nonce: await this.web3Provider.getTransactionCount(
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

  getRecommendedNonce = async (address: string) => {
    try {
      return await this.web3Provider.getTransactionCount(address, 'pending');
    } catch (error) {
      throw error;
    }
  };

  getFeeByType = async (type: string) => {
    const gasPrice = (await this.getRecommendedGasPrice(false)) as string;

    const low = this.toBigNumber(gasPrice)
      .mul(ethers.BigNumber.from('8'))
      .div(ethers.BigNumber.from('10'))
      .toString();

    const high = this.toBigNumber(gasPrice)
      .mul(ethers.BigNumber.from('11'))
      .div(ethers.BigNumber.from('10'))
      .toString();

    if (type === 'low') return low;
    if (type === 'high') return high;

    return gasPrice;
  };

  getGasLimit = async (toAddress: string) => {
    try {
      const estimated = await this.web3Provider.estimateGas({
        to: toAddress,
      });

      return Number(ethers.utils.formatUnits(estimated, 'gwei'));
    } catch (error) {
      throw error;
    }
  };

  getTxGasLimit = async (tx: SimpleTransactionRequest) => {
    try {
      return this.web3Provider.estimateGas(tx);
    } catch (error) {
      throw error;
    }
  };

  getRecommendedGasPrice = async (formatted?: boolean) => {
    try {
      const gasPriceBN = await this.web3Provider.getGasPrice();

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

  getBalance = async (address: string) => {
    try {
      const balance = await this.web3Provider.getBalance(address);
      const formattedBalance = ethers.utils.formatEther(balance);

      const roundedBalance = floor(parseFloat(formattedBalance), 4);

      return roundedBalance;
    } catch (error) {
      return 0;
    }
  };

  private getTransactionTimestamp = async (
    transaction: TransactionResponse
  ) => {
    const { timestamp } = await this.web3Provider.getBlock(
      Number(transaction.blockNumber)
    );

    return {
      ...transaction,
      timestamp,
    } as TransactionResponse;
  };

  public setWeb3Provider(network: INetwork) {
    this.web3Provider = new ethers.providers.JsonRpcProvider(network.url);
  }

  public importAccount = (mnemonicOrPrivKey: string) => {
    if (ethers.utils.isHexString(mnemonicOrPrivKey)) {
      return new ethers.Wallet(mnemonicOrPrivKey);
    }

    const { privateKey } = ethers.Wallet.fromMnemonic(mnemonicOrPrivKey);

    const account = new ethers.Wallet(privateKey);

    return account;
  };
}
