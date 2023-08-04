import { TransactionResponse } from '@ethersproject/abstract-provider';
import { EthereumTransactionEIP1559 } from '@trezor/connect-web';
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
import { BigNumber, ethers } from 'ethers';
import { Deferrable } from 'ethers/lib/utils';
import floor from 'lodash/floor';
import omit from 'lodash/omit';

import { CustomJsonRpcProvider } from '../providers';
import { SyscoinHDSigner } from '../signers';
import { TrezorKeyring } from '../trezor';
import {
  IResponseFromSendErcSignedTransaction,
  ISendSignedErcTransactionProps,
  ISendTransaction,
  IEthereumTransactions,
  SimpleTransactionRequest,
  KeyringAccountType,
  accountType,
} from '../types';
import { INetwork } from '@pollum-io/sysweb3-network';
import {
  createContractUsingAbi,
  getErc20Abi,
  getErc21Abi,
} from '@pollum-io/sysweb3-utils';

export class EthereumTransactions implements IEthereumTransactions {
  public web3Provider: CustomJsonRpcProvider;
  public contentScriptWeb3Provider: CustomJsonRpcProvider;
  public trezorSigner: TrezorKeyring;
  private getNetwork: () => INetwork;
  private abortController: AbortController;
  private getDecryptedPrivateKey: () => {
    address: string;
    decryptedPrivateKey: string;
  };
  private getSigner: () => {
    hd: SyscoinHDSigner;
    main: any;
  };
  private getState: () => {
    activeAccountId: number;
    accounts: {
      Trezor: accountType;
      Imported: accountType;
      HDAccount: accountType;
    };
    activeAccountType: KeyringAccountType;
    activeNetwork: INetwork;
  };

  constructor(
    getNetwork: () => INetwork,
    getDecryptedPrivateKey: () => {
      address: string;
      decryptedPrivateKey: string;
    },
    getSigner: () => {
      hd: SyscoinHDSigner;
      main: any;
    },
    getState: () => {
      activeAccountId: number;
      accounts: {
        Trezor: accountType;
        Imported: accountType;
        HDAccount: accountType;
      };
      activeAccountType: KeyringAccountType;
      activeNetwork: INetwork;
    }
  ) {
    this.getNetwork = getNetwork;
    this.getDecryptedPrivateKey = getDecryptedPrivateKey;
    this.abortController = new AbortController();
    this.web3Provider = new CustomJsonRpcProvider(
      this.abortController.signal,
      this.getNetwork().url
    );
    this.contentScriptWeb3Provider = new CustomJsonRpcProvider(
      this.abortController.signal,
      this.getNetwork().url
    );
    this.getSigner = getSigner;
    this.getState = getState;
    this.trezorSigner = new TrezorKeyring(this.getSigner);
  }

  signTypedData = async (
    addr: string,
    typedData: TypedData | TypedMessage<any>,
    version: Version
  ) => {
    const { address, decryptedPrivateKey } = this.getDecryptedPrivateKey();
    const { activeAccountType, accounts, activeAccountId } = this.getState();
    const activeAccount = accounts[activeAccountType][activeAccountId];

    const signTypedData = () => {
      if (addr.toLowerCase() !== address.toLowerCase())
        throw {
          message: 'Decrypting for wrong address, change activeAccount maybe',
        };

      const privKey = Buffer.from(stripHexPrefix(decryptedPrivateKey), 'hex');
      return signTypedMessage(privKey, { data: typedData }, version);
    };

    const signTypedDataWithTrezor = async () => {
      if (addr.toLowerCase() !== activeAccount.address.toLowerCase())
        throw {
          message: 'Decrypting for wrong address, change activeAccount maybe',
        };
      return await this.trezorSigner.signTypedData({
        version,
        address: addr,
        data: typedData,
        index: activeAccountId,
      });
    };

    switch (activeAccountType) {
      case KeyringAccountType.Trezor:
        return await signTypedDataWithTrezor();
      default:
        return signTypedData();
    }
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

  ethSign = async (params: string[]) => {
    const { address, decryptedPrivateKey } = this.getDecryptedPrivateKey();
    const { accounts, activeAccountId, activeAccountType } = this.getState();
    const activeAccount = accounts[activeAccountType][activeAccountId];

    let msg = '';
    //Comparisions do not need to care for checksum address
    if (params[0].toLowerCase() === address.toLowerCase()) {
      msg = stripHexPrefix(params[1]);
    } else if (params[1].toLowerCase() === address.toLowerCase()) {
      msg = stripHexPrefix(params[0]);
    } else {
      throw { msg: 'Signing for wrong address' };
    }

    const sign = () => {
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

    const signWithTrezor = async () => {
      try {
        const response: any = await this.trezorSigner.signMessage({
          coin: 'eth',
          address: activeAccount.address,
          index: activeAccountId,
          message: msg,
        });
        return response.signature as string;
      } catch (error) {
        throw error;
      }
    };

    switch (activeAccountType) {
      case KeyringAccountType.Trezor:
        return await signWithTrezor();
      default:
        return sign();
    }
  };

  signPersonalMessage = async (params: string[]) => {
    const { address, decryptedPrivateKey } = this.getDecryptedPrivateKey();
    const { accounts, activeAccountId, activeAccountType } = this.getState();
    const activeAccount = accounts[activeAccountType][activeAccountId];
    let msg = '';

    if (params[0].toLowerCase() === address.toLowerCase()) {
      msg = params[1];
    } else if (params[1].toLowerCase() === address.toLowerCase()) {
      msg = params[0];
    } else {
      throw { msg: 'Signing for wrong address' };
    }

    const signPersonalMessageWithDefaultWallet = () => {
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
    const signPersonalMessageWithTrezor = async () => {
      try {
        const response: any = await this.trezorSigner.signMessage({
          coin: 'eth',
          address: activeAccount.address,
          index: activeAccountId,
          message: msg,
        });
        return response.signature as string;
      } catch (error) {
        throw error;
      }
    };

    switch (activeAccountType) {
      case KeyringAccountType.Trezor:
        return await signPersonalMessageWithTrezor();
      default:
        return signPersonalMessageWithDefaultWallet();
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
      const contract = createContractUsingAbi(
        abi,
        contractAddress,
        this.web3Provider
      );
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
      const block = await this.web3Provider.getBlock('latest');
      if (block && block.baseFeePerGas) {
        try {
          const ethMaxPriorityFee = await this.web3Provider.send(
            'eth_maxPriorityFeePerGas',
            []
          );
          maxPriorityFeePerGas = ethers.BigNumber.from(ethMaxPriorityFee);
          maxFeePerGas = block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas);
        } catch (e) {
          maxPriorityFeePerGas = ethers.BigNumber.from('1500000000');
          maxFeePerGas = block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas);
        }
        return { maxFeePerGas, maxPriorityFeePerGas };
      } else if (block && !block.baseFeePerGas) {
        console.error('Chain doesnt support EIP1559');
        return { maxFeePerGas, maxPriorityFeePerGas };
      } else if (!block) throw { msg: 'Block not found' };

      return { maxFeePerGas, maxPriorityFeePerGas };
    } catch (error) {
      console.error(error);
      return { maxFeePerGas, maxPriorityFeePerGas };
    }
  };
  cancelSentTransaction = async (txHash: string, isLegacy?: boolean) => {
    const tx = (await this.web3Provider.getTransaction(
      txHash
    )) as Deferrable<ethers.providers.TransactionRequest>;

    if (!tx) {
      throw new Error('Transaction not found or already confirmed!');
    }

    let changedTxToCancel: Deferrable<ethers.providers.TransactionRequest>;

    if (!isLegacy) {
      const feeValue = tx.maxFeePerGas as BigNumber;

      const calculatedFee = feeValue.toNumber() * 1.2;

      changedTxToCancel = {
        ...tx,
        value: 0, //Need 0 as value to cancel it
        maxFeePerGas: this.toBigNumber(calculatedFee), //The same calculation we used in the edit fee modal, always using the 0.2 multiplier
      };
    } else {
      const feeValue = tx.gasPrice as BigNumber;

      const calculatedFee = feeValue.toNumber() * 1.2;

      changedTxToCancel = {
        ...tx,
        value: 0, //Need 0 as value to cancel it
        gasPrice: this.toBigNumber(calculatedFee), //The same calculation we used in the edit fee modal, always using the 0.2 multiplier
      };
    }

    const cancelTransaction = async () => {
      const { decryptedPrivateKey } = this.getDecryptedPrivateKey();
      const wallet = new ethers.Wallet(decryptedPrivateKey, this.web3Provider);
      try {
        const transaction = await wallet.sendTransaction(changedTxToCancel);
        const response = await this.web3Provider.getTransaction(
          transaction.hash
        );
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

    return await cancelTransaction();
  };
  //TODO: This function needs to be refactored
  sendFormattedTransaction = async (
    params: SimpleTransactionRequest,
    isLegacy?: boolean
  ) => {
    const { decryptedPrivateKey } = this.getDecryptedPrivateKey();
    const { activeAccountType, activeAccountId, accounts, activeNetwork } =
      this.getState();
    const activeAccount = accounts[activeAccountType][activeAccountId];

    const sendEVMTrezorTransaction = async () => {
      const transactionNonce = await this.getRecommendedNonce(
        activeAccount.address
      );
      let txFormattedForTrezor = {};
      const formatParams = omit(params, 'from'); //From is not needed we're already passing in the HD derivation path so it can be inferred
      switch (isLegacy) {
        case true:
          txFormattedForTrezor = {
            ...formatParams,
            gasLimit:
              typeof formatParams.gasLimit === 'string'
                ? formatParams.gasLimit
                : // @ts-ignore
                  `${params.gasLimit.toHexString()}`,
            value:
              typeof formatParams.value === 'string' ||
              typeof formatParams.value === 'number'
                ? `${formatParams.value}`
                : // @ts-ignore
                  `${params.value.toHexString()}`,
            nonce: this.toBigNumber(transactionNonce)._hex,
            chainId: activeNetwork.chainId,
          };
          break;
        case false:
          txFormattedForTrezor = {
            ...formatParams,
            gasLimit:
              typeof formatParams.gasLimit === 'string'
                ? formatParams.gasLimit
                : // @ts-ignore
                  `${params.gasLimit.toHexString()}`,
            maxFeePerGas:
              typeof formatParams.maxFeePerGas === 'string'
                ? formatParams.maxFeePerGas
                : // @ts-ignore
                  `${params.maxFeePerGas.toHexString()}`,
            maxPriorityFeePerGas:
              typeof formatParams.maxPriorityFeePerGas === 'string'
                ? formatParams.maxPriorityFeePerGas
                : // @ts-ignore
                  `${params.maxPriorityFeePerGas.toHexString()}`,
            value:
              typeof formatParams.value === 'string' ||
              typeof formatParams.value === 'number'
                ? `${formatParams.value}`
                : // @ts-ignore
                  `${params.value.toHexString()}`,
            nonce: this.toBigNumber(transactionNonce)._hex,
            chainId: activeNetwork.chainId,
          };
          break;
        default:
          txFormattedForTrezor = {
            ...formatParams,
            gasLimit:
              typeof formatParams.gasLimit === 'string'
                ? formatParams.gasLimit
                : // @ts-ignore
                  `${params.gasLimit.toHexString()}`,
            maxFeePerGas:
              typeof formatParams.maxFeePerGas === 'string'
                ? formatParams.maxFeePerGas
                : // @ts-ignore
                  `${params.maxFeePerGas.toHexString()}`,
            maxPriorityFeePerGas:
              typeof formatParams.maxPriorityFeePerGas === 'string'
                ? formatParams.maxPriorityFeePerGas
                : // @ts-ignore
                  `${params.maxPriorityFeePerGas.toHexString()}`,
            value:
              typeof formatParams.value === 'string' ||
              typeof formatParams.value === 'number'
                ? `${formatParams.value}`
                : // @ts-ignore
                  `${params.value.toHexString()}`,
            nonce: this.toBigNumber(transactionNonce)._hex,
            chainId: activeNetwork.chainId,
          };
          break;
      }

      const signature = await this.trezorSigner.signEthTransaction({
        index: `${activeAccountId}`,
        tx: txFormattedForTrezor as EthereumTransactionEIP1559,
      });
      if (signature.success) {
        try {
          const txFormattedForEthers = isLegacy
            ? {
                ...formatParams,
                nonce: transactionNonce,
                chainId: activeNetwork.chainId,
              }
            : {
                ...formatParams,
                nonce: transactionNonce,
                chainId: activeNetwork.chainId,
                type: 2,
              };
          signature.payload.v = parseInt(signature.payload.v, 16); //v parameter must be a number by ethers standards
          const signedTx = ethers.utils.serializeTransaction(
            txFormattedForEthers,
            signature.payload
          );
          const finalTx = await this.web3Provider.sendTransaction(signedTx);

          return finalTx;
        } catch (error) {
          throw error;
        }
      } else {
        throw new Error(`Transaction Signature Failed. Error: ${signature}`);
      }
    };

    const sendEVMTransaction = async () => {
      const tx: Deferrable<ethers.providers.TransactionRequest> = params;
      const wallet = new ethers.Wallet(decryptedPrivateKey, this.web3Provider);
      try {
        const transaction = await wallet.sendTransaction(tx);
        const response = await this.web3Provider.getTransaction(
          transaction.hash
        );
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
    switch (activeAccountType) {
      case KeyringAccountType.Trezor:
        return await sendEVMTrezorTransaction();
      default:
        return await sendEVMTransaction();
    }
  };
  sendTransactionWithEditedFee = async (txHash: string, isLegacy?: boolean) => {
    const tx = (await this.web3Provider.getTransaction(
      txHash
    )) as Deferrable<ethers.providers.TransactionRequest>;

    if (!tx) {
      throw new Error('Transaction not found or already confirmed!');
    }

    let txWithEditedFee: Deferrable<ethers.providers.TransactionRequest>;

    if (!isLegacy) {
      const feeValue = tx.maxFeePerGas as BigNumber;

      const calculatedFee = feeValue.toNumber() * 1.2;

      txWithEditedFee = {
        ...tx,
        maxFeePerGas: this.toBigNumber(calculatedFee), //The same calculation we used in the edit fee modal, always using the 0.2 multiplier
      };
    } else {
      const feeValue = tx.gasPrice as BigNumber;

      const calculatedFee = feeValue.toNumber() * 1.2;

      txWithEditedFee = {
        ...tx,
        gasPrice: this.toBigNumber(calculatedFee), //The same calculation we used in the edit fee modal, always using the 0.2 multiplier
      };
    }

    const sendEditedTransaction = async () => {
      const { decryptedPrivateKey } = this.getDecryptedPrivateKey();
      const wallet = new ethers.Wallet(decryptedPrivateKey, this.web3Provider);
      try {
        const transaction = await wallet.sendTransaction(txWithEditedFee);
        const response = await this.web3Provider.getTransaction(
          transaction.hash
        );
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

    return await sendEditedTransaction();
  };
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
    isLegacy = false,
    maxPriorityFeePerGas,
    maxFeePerGas,
    gasPrice,
    gasLimit,
    saveTrezorTx,
  }: ISendSignedErcTransactionProps): Promise<IResponseFromSendErcSignedTransaction> => {
    const { decryptedPrivateKey } = this.getDecryptedPrivateKey();
    const { accounts, activeAccountType, activeAccountId, activeNetwork } =
      this.getState();
    const { address: activeAccountAddress } =
      accounts[activeAccountType][activeAccountId];

    const sendERC20Token = async () => {
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
        let transferMethod;
        if (isLegacy) {
          transferMethod = await _contract.transfer(
            receiver,
            calculatedTokenAmount,
            {
              nonce: await this.web3Provider.getTransactionCount(
                walletSigned.address,
                'pending'
              ),
              gasPrice,
              gasLimit,
            }
          );
        } else {
          transferMethod = await _contract.transfer(
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
        }

        return transferMethod;
      } catch (error) {
        throw error;
      }
    };

    const sendERC20TokenOnTrezor = async () => {
      const signer = this.web3Provider.getSigner(activeAccountAddress);
      const transactionNonce = await this.getRecommendedNonce(
        activeAccountAddress
      );
      try {
        const _contract = new ethers.Contract(
          tokenAddress,
          getErc20Abi(),
          signer
        );

        const calculatedTokenAmount = ethers.BigNumber.from(
          ethers.utils.parseEther(tokenAmount as string)
        );

        const txData = _contract.interface.encodeFunctionData('transfer', [
          receiver,
          calculatedTokenAmount,
        ]);
        let txToBeSignedByTrezor;
        if (isLegacy) {
          txToBeSignedByTrezor = {
            to: tokenAddress,
            value: '0x0',
            // @ts-ignore
            gasLimit: `${gasLimit.toHexString()}`,
            // @ts-ignore
            gasPrice: `${gasPrice}`,
            nonce: this.toBigNumber(transactionNonce)._hex,
            chainId: activeNetwork.chainId,
            data: txData,
          };
        } else {
          txToBeSignedByTrezor = {
            to: tokenAddress,
            value: '0x0',
            // @ts-ignore
            gasLimit: `${gasLimit.toHexString()}`,
            // @ts-ignore
            maxFeePerGas: `${maxFeePerGas.toHexString()}`,
            // @ts-ignore
            maxPriorityFeePerGas: `${maxPriorityFeePerGas.toHexString()}`,
            nonce: this.toBigNumber(transactionNonce)._hex,
            chainId: activeNetwork.chainId,
            data: txData,
          };
        }

        const signature = await this.trezorSigner.signEthTransaction({
          index: `${activeAccountId}`,
          tx: txToBeSignedByTrezor,
        });

        if (signature.success) {
          try {
            let txFormattedForEthers;
            if (isLegacy) {
              txFormattedForEthers = {
                to: tokenAddress,
                value: '0x0',
                gasLimit,
                gasPrice,
                data: txData,
                nonce: transactionNonce,
                chainId: activeNetwork.chainId,
                type: 0,
              };
            } else {
              txFormattedForEthers = {
                to: tokenAddress,
                value: '0x0',
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas,
                data: txData,
                nonce: transactionNonce,
                chainId: activeNetwork.chainId,
                type: 2,
              };
            }
            signature.payload.v = parseInt(signature.payload.v, 16); //v parameter must be a number by ethers standards
            const signedTx = ethers.utils.serializeTransaction(
              txFormattedForEthers,
              signature.payload
            );
            const finalTx = await this.web3Provider.sendTransaction(signedTx);

            saveTrezorTx && saveTrezorTx(finalTx);

            return finalTx as any;
          } catch (error) {
            throw error;
          }
        } else {
          throw new Error(`Transaction Signature Failed. Error: ${signature}`);
        }
      } catch (error) {
        throw error;
      }
    };

    switch (activeAccountType) {
      case KeyringAccountType.Trezor:
        return await sendERC20TokenOnTrezor();
      default:
        return await sendERC20Token();
    }
  };

  sendSignedErc721Transaction = async ({
    receiver,
    tokenAddress,
    tokenId,
    isLegacy,
    maxPriorityFeePerGas,
    maxFeePerGas,
    gasPrice,
    gasLimit,
  }: ISendSignedErcTransactionProps): Promise<IResponseFromSendErcSignedTransaction> => {
    const { decryptedPrivateKey } = this.getDecryptedPrivateKey();
    const { accounts, activeAccountType, activeAccountId, activeNetwork } =
      this.getState();
    const { address: activeAccountAddress } =
      accounts[activeAccountType][activeAccountId];

    const sendERC721Token = async () => {
      const currentWallet = new ethers.Wallet(decryptedPrivateKey);
      const walletSigned = currentWallet.connect(this.web3Provider);
      let transferMethod;
      try {
        const _contract = new ethers.Contract(
          tokenAddress,
          getErc21Abi(),
          walletSigned
        );

        if (isLegacy) {
          transferMethod = await _contract.transferFrom(
            walletSigned.address,
            receiver,
            tokenId as number,
            {
              nonce: await this.web3Provider.getTransactionCount(
                walletSigned.address,
                'pending'
              ),
              gasLimit,
              gasPrice,
            }
          );
        } else {
          transferMethod = await _contract.transferFrom(
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
        }

        return transferMethod;
      } catch (error) {
        throw error;
      }
    };

    const sendERC721TokenOnTrezor = async () => {
      const signer = this.web3Provider.getSigner(activeAccountAddress);
      const transactionNonce = await this.getRecommendedNonce(
        activeAccountAddress
      );
      try {
        const _contract = new ethers.Contract(
          tokenAddress,
          getErc21Abi(),
          signer
        );
        const txData = _contract.interface.encodeFunctionData('transferFrom', [
          activeAccountAddress,
          receiver,
          tokenId,
        ]);
        let txToBeSignedByTrezor;
        if (isLegacy) {
          txToBeSignedByTrezor = {
            to: tokenAddress,
            value: '0x0',
            // @ts-ignore
            gasLimit: `${gasLimit.toHexString()}`,
            // @ts-ignore
            gasPrice: `${gasPrice}`,
            nonce: this.toBigNumber(transactionNonce)._hex,
            chainId: activeNetwork.chainId,
            data: txData,
          };
          console.log({ txToBeSignedByTrezor });
        } else {
          txToBeSignedByTrezor = {
            to: tokenAddress,
            value: '0x0',
            // @ts-ignore
            gasLimit: `${gasLimit.toHexString()}`,
            // @ts-ignore
            maxFeePerGas: `${maxFeePerGas.toHexString()}`,
            // @ts-ignore
            maxPriorityFeePerGas: `${maxPriorityFeePerGas.toHexString()}`,
            nonce: this.toBigNumber(transactionNonce)._hex,
            chainId: activeNetwork.chainId,
            data: txData,
          };
        }

        const signature = await this.trezorSigner.signEthTransaction({
          index: `${activeAccountId}`,
          tx: txToBeSignedByTrezor,
        });

        if (signature.success) {
          try {
            let txFormattedForEthers;
            if (isLegacy) {
              txFormattedForEthers = {
                to: tokenAddress,
                value: '0x0',
                gasLimit,
                gasPrice,
                data: txData,
                nonce: transactionNonce,
                chainId: activeNetwork.chainId,
                type: 0,
              };
            } else {
              txFormattedForEthers = {
                to: tokenAddress,
                value: '0x0',
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas,
                data: txData,
                nonce: transactionNonce,
                chainId: activeNetwork.chainId,
                type: 2,
              };
            }
            signature.payload.v = parseInt(signature.payload.v, 16); //v parameter must be a number by ethers standards
            const signedTx = ethers.utils.serializeTransaction(
              txFormattedForEthers,
              signature.payload
            );
            const finalTx = await this.web3Provider.sendTransaction(signedTx);

            return finalTx as any;
          } catch (error) {
            console.log({ error });
            throw error;
          }
        } else {
          throw new Error(`Transaction Signature Failed. Error: ${signature}`);
        }
      } catch (error) {
        console.log({ errorDois: error });
        throw error;
      }
    };

    switch (activeAccountType) {
      case KeyringAccountType.Trezor:
        return await sendERC721TokenOnTrezor();
      default:
        return await sendERC721Token();
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
    this.abortController.abort();
    this.abortController = new AbortController();
    this.web3Provider = new CustomJsonRpcProvider(
      this.abortController.signal,
      network.url
    );
    this.contentScriptWeb3Provider = new CustomJsonRpcProvider(
      this.abortController.signal,
      network.url
    );
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
