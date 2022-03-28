import sys from 'syscoinjs-lib';
import {
  estimateSysTransactionFee,
  isBase64,
} from '@pollum-io/sysweb3-utils';
import syscointx from 'syscointx-js';

const SysTransactionsController = ({
  account,
  signer,
}): ISysTransactionsController => {
  const watchMemPool = (accountId: number): boolean => {
    const intervalId = setInterval(() => {
      account.getLatestUpdate();

      const { accounts }: IWalletState = store.getState().vault;

      const activeAccount = accounts[accountId];

      if (
        !activeAccount ||
        !activeAccount?.transactions ||
        !activeAccount?.transactions.filter(
          (tx: Transaction) => tx.confirmations > 0
        ).length
      ) {
        clearInterval(intervalId);

        return false;
      }
    }, 30 * 1000);

    return true;
  };

  const temporaryTransaction: TemporaryTransaction = {
    newAsset: null,
    mintAsset: null,
    newNFT: null,
    updateAsset: null,
    transferAsset: null,
    sendAsset: null,
    signPSBT: null,
    signAndSendPSBT: null,
    mintNFT: null,
  };

  const getTemporaryTransaction = (type: string): TemporaryTransaction =>
    temporaryTransaction[type];

  const clearTemporaryTransaction = (type: string): void => {
    temporaryTransaction[type] = null;
  };

  const setTemporaryTransaction = ({
    tx,
    type,
  }: {
    tx: TemporaryTransaction;
    type: string;
  }): void => {
    temporaryTransaction[type] = { ...tx };
  };

  const confirmTemporaryTransaction = ({
    type,
    callback,
  }: {
    type: string;
    callback: any;
  }): Promise<any> =>
    new Promise((resolve, reject) => {
      try {
        const { accounts, activeAccountId }: IWalletState =
          store.getState().wallet;

        const activeAccount = accounts.find(
          (account: IAccountState) => account.id === activeAccountId
        );

        const response = handleTransactions({
          temporaryTransaction: getTemporaryTransaction(type),
          callback,
          signer,
          activeAccount,
          condition: null,
        });

        resolve(response);
      } catch (error: any) {
        reject(error);
      }
    });

  const getRawTransaction = (txid: string) =>
    sys.utils.fetchBackendRawTx(signer.blockbookURL, txid);

  const getPsbtFromJson = (psbt: JSON): string =>
    sys.utils.importPsbtFromJson(psbt);

  const _getTokenMap = ({
    guid,
    changeAddress,
    amount,
    receivingAddress,
  }): ITokenMap => {
    return new Map([
      [
        String(guid),
        {
          changeAddress,
          outputs: [
            {
              value: amount,
              address: receivingAddress,
            },
          ],
        },
      ],
    ]);
  };

  const _getFeeRate = (fee: number): BigInt => new sys.utils.BN(fee * 1e8);

  const _createMintedToken = async ({
    txid,
    guid,
    initialSupply,
    precision,
    receivingAddress,
    fee,
  }) => {
    return await new Promise((resolve: any, reject: any) => {
      const interval = setInterval(async () => {
        const createdTokenTransaction = await getRawTransaction(txid);

        if (createdTokenTransaction?.confirmations > 1) {
          const changeAddress = await signer.getNewChangeAddress(true);

          try {
            const tokenMap = _getTokenMap({
              guid,
              changeAddress,
              amount: new sys.utils.BN(initialSupply * 10 ** precision),
              receivingAddress,
            });
            const txOptions = { rbf: true };

            const pendingTransaction = await signer.assetSend(
              txOptions,
              tokenMap,
              receivingAddress,
              _getFeeRate(fee)
            );

            if (!pendingTransaction) {
              createError(
                404,
                'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
              );
            }

            const txid = pendingTransaction.extractTransaction().getId();

            account.setAccountTransactions(txid, account.currentAccount);

            const connectedAccount = getConnectedAccount();

            const { activeAccount } = store.getState().vault;

            watchMemPool(
              connectedAccount ? connectedAccount.id : activeAccount.id
            );
            clearInterval(interval);

            resolve({
              createdTokenTransaction,
              txid,
              confirmations: createdTokenTransaction.confirmations,
              guid,
            });
          } catch (error) {
            clearInterval(interval);

            reject(error);
          }
        }
      }, 16000);
    });
  };

  // todo: create temp tx type new token
  const _getTokenUpdateOptions = (temporaryTransaction: any) => {
    const {
      capabilityflags,
      contract,
      description,
      notarydetails,
      auxfeedetails,
      notaryAddress,
      payoutAddress,
    } = temporaryTransaction;

    let tokenOptions = {
      description,
      updatecapabilityflags: capabilityflags ? String(capabilityflags) : '127',
      notarydetails,
      auxfeedetails,
      notarykeyid: Buffer.from('', 'hex'),
      contract: contract ? Buffer.from(contract, 'hex') : null,
    };

    if (notaryAddress) {
      const notaryPayment = sys.utils.bitcoinjs.payments.p2wpkh({
        address: notaryAddress,
        network: signer.network,
      });

      tokenOptions = {
        ...tokenOptions,
        notarydetails: {
          ...notarydetails,
          endpoint: Buffer.from(
            syscointx.utils.encodeToBase64(notarydetails.endpoint)
          ),
        },
        notarykeyid: Buffer.from(notaryPayment.hash.toString('hex'), 'hex'),
      };
    }

    if (payoutAddress) {
      const payment = sys.utils.bitcoinjs.payments.p2wpkh({
        address: payoutAddress,
        network: signer.network,
      });

      const auxFeeKeyID = Buffer.from(payment.hash.toString('hex'), 'hex');

      tokenOptions = {
        ...tokenOptions,
        auxfeedetails: {
          ...tokenOptions.auxfeedetails,
          auxfeekeyid: auxFeeKeyID,
        },
      };
    }

    return tokenOptions;
  };

  // todo: create temp tx type new token
  const _getTokenCreationOptions = (temporaryTransaction: any) => {
    const {
      capabilityflags,
      notarydetails,
      auxfeedetails,
      precision,
      symbol,
      description,
      maxsupply,
      notaryAddress,
      payoutAddress,
    } = temporaryTransaction;

    const newMaxSupply = maxsupply * 10 ** precision;

    let tokenOptions = {
      precision,
      symbol,
      description,
      maxsupply: new sys.utils.BN(newMaxSupply),
      updatecapabilityflags: capabilityflags ? String(capabilityflags) : '127',
      notarydetails,
      auxfeedetails,
      notarykeyid: Buffer.from('', 'hex'),
    };

    if (notaryAddress) {
      const notaryPayment = sys.utils.bitcoinjs.payments.p2wpkh({
        address: notaryAddress,
        network: signer.network,
      });

      tokenOptions = {
        ...tokenOptions,
        notarydetails: {
          ...notarydetails,
          endpoint: Buffer.from(
            syscointx.utils.encodeToBase64(notarydetails.endpoint)
          ),
        },
        notarykeyid: Buffer.from(notaryPayment.hash.toString('hex'), 'hex'),
      };
    }

    if (payoutAddress) {
      const payment = sys.utils.bitcoinjs.payments.p2wpkh({
        address: payoutAddress,
        network: signer.network,
      });

      const auxFeeKeyID = Buffer.from(payment.hash.toString('hex'), 'hex');

      tokenOptions = {
        ...tokenOptions,
        auxfeedetails: {
          ...tokenOptions.auxfeedetails,
          auxfeekeyid: auxFeeKeyID,
        },
      };
    }

    return tokenOptions;
  };

  const confirmTokenCreation = async (
    temporaryTransaction: NewToken
  ): Promise<TokenCreationResponse> => {
    const { precision, initialSupply, maxsupply, fee, receiver } =
      temporaryTransaction;

    const amount = maxsupply * 10 ** precision;

    if (getConnectedAccount()?.isTrezorWallet) {
      throw new Error("Trezor don't support burning of coins");
    }

    signer.setAccountIndex(getConnectedAccount()?.id);

    const tokenOptions = _getTokenCreationOptions(temporaryTransaction);
    const txOptions = { rbf: true };

    const pendingTransaction = await signer.assetNew(
      tokenOptions,
      txOptions,
      await signer.getNewChangeAddress(true),
      receiver,
      new sys.utils.BN(fee * 1e8)
    );

    const txid = pendingTransaction.extractTransaction().getId();

    account.setAccountTransactions(txid, account.currentAccount);

    const transactionData = await getRawTransaction(txid);
    const assets = syscointx.getAssetsFromTx(
      pendingTransaction.extractTransaction()
    );
    const createdTokenGuid = assets.keys().next().value;

    if (initialSupply && initialSupply < amount) {
      _createMintedToken({
        txid,
        guid: createdTokenGuid,
        initialSupply,
        precision,
        receivingAddress: receiver,
        fee,
      });
    }

    return {
      transactionData,
      txid,
      confirmations: transactionData.confirmations,
      guid: createdTokenGuid,
    };
  };

  const confirmTokenMint = async (
    temporaryTransaction: TokenMint
  ): Promise<ITxid> => {
    const { fee, assetGuid, amount } = temporaryTransaction;

    const feeRate = new sys.utils.BN(fee * 1e8);

    if (!getConnectedAccount()?.isTrezorWallet) {
      signer.setAccountIndex(getConnectedAccount()?.id);
    }

    const { decimals } = await account.tokens.getToken(assetGuid);
    const receivingAddress = await signer.getNewReceivingAddress(true);
    const txOptions = { rbf: true };

    const tokenMap = _getTokenMap({
      guid: assetGuid,
      changeAddress: await signer.getNewChangeAddress(true),
      amount: new sys.utils.BN(amount * 10 ** decimals),
      receivingAddress,
    });

    if (getConnectedAccount()?.isTrezorWallet) {
      return await window.controller.trezor.confirmTokenMint({
        tokenOptions: tokenMap,
        feeRate,
      });
    }

    const pendingTransaction = await signer.assetSend(
      txOptions,
      tokenMap,
      await signer.getNewChangeAddress(true),
      feeRate
    );

    if (!pendingTransaction) {
      createError(
        404,
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const txid = pendingTransaction.extractTransaction().getId();

    account.setAccountTransactions(txid, account.currentAccount);

    watchMemPool(account.currentAccount);

    return { txid };
  };

  const _createParentToken = async ({ tokenOptions, feeRate }) => {
    if (!account.currentAccount.isTrezorWallet) {
      signer.setAccountIndex(account.currentAccount.id);
    }

    const tokenChangeAddress = await signer.getNewChangeAddress(true);
    const txOptions = { rbf: true };

    const pendingTransaction = await signer.assetNew(
      tokenOptions,
      txOptions,
      tokenChangeAddress,
      tokenChangeAddress,
      feeRate
    );

    if (!pendingTransaction) {
      createError(
        404,
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const tokensFromTransaction = syscointx.getAssetsFromTx(
      pendingTransaction.extractTransaction()
    );
    const txid = pendingTransaction.extractTransaction().getId();

    return {
      guid: tokensFromTransaction.keys().next().value,
      txid,
    };
  };

  const _mintParentToken = async ({
    parentTokenTransaction,
    parentToken,
    precision,
    receivingAddress,
    feeRate,
  }) => {
    if (parentTokenTransaction.confirmations >= 1) {
      const tokenMap = _getTokenMap({
        guid: parentToken?.guid,
        changeAddress: null,
        amount: new sys.utils.BN(1 * 10 ** precision),
        receivingAddress,
      });

      try {
        const txOptions = { rbf: true };
        const pendingTransaction = await signer.assetSend(
          txOptions,
          tokenMap,
          null,
          feeRate
        );

        if (!pendingTransaction) {
          createError(
            404,
            'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
          );
        }

        const txid = pendingTransaction.extractTransaction().getId();

        account.setAccountTransactions(txid, account.currentAccount);

        return txid;
      } catch (error) {
        createError(404, error);
      }
    }
  };

  const _updateParentToken = async ({ parentToken, receivingAddress }) => {
    const feeRate = new sys.utils.BN(10);
    const guid = parentToken?.guid;
    const tokenOptions = { updatecapabilityflags: '0' };
    const txOptions = { rbf: true };

    const tokenMap = _getTokenMap({
      guid,
      changeAddress: null,
      amount: new sys.utils.BN(0),
      receivingAddress,
    });

    const txid = await signer.assetUpdate(
      guid,
      tokenOptions,
      txOptions,
      tokenMap,
      receivingAddress,
      feeRate
    );

    if (!txid) {
      createError(
        404,
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    return txid;
  };

  const confirmNftCreation = async (
    temporaryTransaction: NewNFT
  ): Promise<ITxid> => {
    const { fee, symbol, description, receivingAddress, precision } =
      temporaryTransaction;

    const feeRate = new sys.utils.BN(fee * 1e8);

    if (account.currentAccount.isTrezorWallet) {
      throw new Error("Bad Request: Trezor doesn't support NFT creation.");
    }

    signer.setAccountIndex(account.currentAccount.id);

    const tokenOptions = {
      precision,
      symbol,
      maxsupply: new sys.utils.BN(1 * 10 ** precision),
      description,
    };

    const parentToken = await _createParentToken({ tokenOptions, feeRate });

    if (parentToken?.guid) {
      try {
        return await new Promise((resolve) => {
          const interval = setInterval(async () => {
            const parentTokenTransaction = await getRawTransaction(
              parentToken.txid
            );

            const txid = await _mintParentToken({
              parentTokenTransaction,
              parentToken,
              precision,
              receivingAddress,
              feeRate,
            });

            const parentTokenMintTransaction = await getRawTransaction(txid);

            if (!parentTokenMintTransaction) {
              throw new Error(
                'Bad Request: Transaction not indexed on explorer yet.'
              );
            }

            if (parentTokenMintTransaction.confirmations > 1) {
              const pendingTransaction = await _updateParentToken({
                parentToken,
                receivingAddress,
              });

              clearInterval(interval);

              resolve({
                txid: pendingTransaction.extractTransaction().getId(),
              });
            }

            return { txid: '' };
          }, 16000);
        });
      } catch (error) {
        throw new Error('Bad Request: Could not create transaction.');
      }
    }

    throw new Error('Bad Request: Could not create transaction.');
  };

  const _sendSignedPsbt = async ({
    psbt,
    signer,
  }: {
    psbt: string;
    signer: any;
  }): Promise<JSON> => {
    return sys.utils.exportPsbtToJson(await signer.sign(psbt));
  };

  const _signAndSendPsbt = async ({
    psbt,
    assets,
    signer,
  }: {
    psbt: string;
    assets: string;
    signer: any;
  }): Promise<JSON> => {
    return sys.utils.exportPsbtToJson(
      await signer.signAndSend(psbt, assets, signer)
    );
  };

  const signTransaction = async (
    data: { psbt: string; assets: string },
    isSendOnly: boolean
  ): Promise<JSON> => {
    if (!isBase64(data.psbt) || typeof data.assets !== 'string') {
      createError(
        404,
        'Bad Request: PSBT must be in Base64 format and assets must be a JSON string. Please check the documentation to see the correct formats.'
      );
    }

    try {
      const response = sys.utils.importPsbtFromJson(data);

      const trezorSigner = new sys.utils.TrezorSigner();

      new sys.SyscoinJSLib(trezorSigner, signer.blockbookURL);

      if (isSendOnly) {
        return await _sendSignedPsbt({
          psbt: response.psbt,
          signer: account.currentAccount.isTrezorWallet ? trezorSigner : signer,
        });
      }

      return await _signAndSendPsbt({
        psbt: response.psbt,
        assets: response.assets,
        signer: account.currentAccount.isTrezorWallet ? trezorSigner : null,
      });
    } catch (error) {
      throw new Error('Bad Request: Could not create transaction.');
    }
  };

  const confirmUpdateToken = async (
    temporaryTransaction: TokenUpdate
  ): Promise<ITxid> => {
    const { fee, assetGuid, assetWhiteList } = temporaryTransaction;

    const txOptions = { rbf: true, assetWhiteList };

    try {
      const tokenMap = _getTokenMap({
        guid: assetGuid,
        changeAddress: await signer.getNewChangeAddress(true),
        amount: new sys.utils.BN(0),
        receivingAddress: await signer.getNewReceivingAddress(true),
      });

      const tokenOptions = _getTokenUpdateOptions(temporaryTransaction);

      if (!account.currentAccount.isTrezorWallet) {
        signer.setAccountIndex(account.currentAccount.id);
      }

      const pendingTransaction = await signer.assetUpdate(
        assetGuid,
        tokenOptions,
        txOptions,
        tokenMap,
        null,
        new sys.utils.BN(fee * 1e8)
      );

      const txid = pendingTransaction.extractTransaction().getId();

      if (!pendingTransaction || !txid) {
        createError(
          404,
          'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
        );
      }

      account.setAccountTransactions(txid, account.currentAccount);

      watchMemPool(account.currentAccount);

      return { txid };
    } catch (error) {
      throw new Error('Bad Request: Could not create transaction.');
    }
  };

  const _confirmCustomTokenSend = async (
    temporaryTransaction: TokenSend
  ): Promise<ITxid> => {
    const { amount, rbf, receivingAddress, fee, token } = temporaryTransaction;
    const { decimals } = await account.tokens.getToken(token);

    const txOptions = { rbf };
    const value = new sys.utils.BN(amount * 10 ** decimals);
    const valueDecimals = countDecimals(amount);
    const feeRate = new sys.utils.BN(fee * 1e8);

    if (valueDecimals > decimals) {
      throw new Error(
        `This token has ${decimals} decimals and you are trying to send a value with ${valueDecimals} decimals, please check your tx`
      );
    }

    try {
      const tokenOptions = _getTokenMap({
        guid: token,
        changeAddress: account.currentAccount?.isTrezorWallet
          ? await window.controller.address.getNewChangeAddress(true)
          : null,
        amount: value,
        receivingAddress,
      });

      if (account.currentAccount?.isTrezorWallet) {
        return await window.controller.trezor.confirmTokenSend({
          txOptions,
          tokenOptions,
          feeRate,
        });
      }

      const pendingTransaction = await signer.assetAllocationSend(
        txOptions,
        tokenOptions,
        null,
        feeRate
      );

      const txid = pendingTransaction.extractTransaction().getId();

      account.setAccountTransactions(txid, account.currentAccount);

      return { txid };
    } catch (error) {
      throw new Error('Bad Request: Could not create transaction.');
    }
  };

  const _confirmNativeTokenSend = async (
    temporaryTransaction: TokenSend
  ): Promise<ITxid> => {
    const { receivingAddress, amount, fee } = temporaryTransaction;

    const feeRate = new sys.utils.BN(fee * 1e8);

    const backendAccount = await sys.utils.fetchBackendAccount(
      signer.blockbookURL,
      account.currentAccount?.xpub,
      {},
      true
    );

    const value = new sys.utils.BN(amount * 1e8);

    let outputs = [
      {
        address: receivingAddress,
        value,
      },
    ];

    const txOptions = { rbf: false };

    const txFee = await estimateSysTransactionFee(
      {
        outputs,
        changeAddress: await signer.Signer.getNewChangeAddress(true),
        feeRate,
      },
      signer,
      account.currentAccount
    );

    if (value.add(txFee).gte(backendAccount.balance)) {
      outputs = [
        {
          address: receivingAddress,
          value: value.sub(txFee),
        },
      ];
    }

    if (account.currentAccount?.isTrezorWallet) {
      return await window.controller.trezor.confirmNativeTokenSend({
        txOptions,
        outputs,
        feeRate,
      });
    }

    try {
      const pendingTransaction = await signer.createTransaction(
        txOptions,
        await signer.Signer.getNewChangeAddress(true),
        outputs,
        feeRate
      );

      const txid = pendingTransaction.extractTransaction().getId();

      account.setAccountTransactions(txid, account.currentAccount);

      return { txid };
    } catch (error) {
      throw new Error('Bad Request: Could not create transaction.');
    }
  };

  const sendTransaction = async (
    temporaryTransaction: TokenSend
  ): Promise<ITxid> => {
    const { isToken, token } = temporaryTransaction;

    if (isToken && token) {
      return await _confirmCustomTokenSend(temporaryTransaction);
    }

    return await _confirmNativeTokenSend(temporaryTransaction);
  };

  const confirmMintNFT = async (
    temporaryTransaction: TokenMint
  ): Promise<ITxid> => {
    const { fee, amount, assetGuid }: any = temporaryTransaction;

    const { decimals } = await account.tokens.getToken(assetGuid);
    const feeRate = new sys.utils.BN(fee * 1e8);
    const txOptions = { rbf: true };

    const tokenMap = _getTokenMap({
      guid: assetGuid,
      changeAddress: await window.controller.address.getNewChangeAddress(true),
      amount: new sys.utils.BN(amount * 10 ** decimals),
      receivingAddress: await window.controller.address.getNewReceivingAddress(
        true
      ),
    });

    try {
      if (!account.currentAccount.isTrezorWallet) {
        signer.setAccountIndex(account.currentAccount.id);
      }

      const pendingTransaction = await signer.assetSend(
        txOptions,
        tokenMap,
        await window.controller.address.getNewChangeAddress(true),
        feeRate
      );

      if (!pendingTransaction) {
        throw new Error(
          'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
        );
      }

      const txid = pendingTransaction.extractTransaction().getId();

      account.setAccountTransactions(txid, account.currentAccount);

      return { txid };
    } catch (error) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }
  };

  const getRecommendedFee = async (): Promise<number> =>
    (await sys.utils.fetchEstimateFee(signer.blockbookURL, 1)) / 10 ** 8;

  return {
    watchMemPool,
    confirmTemporaryTransaction,
    clearTemporaryTransaction,
    setTemporaryTransaction,
    getTemporaryTransaction,
    getRawTransaction,
    getPsbtFromJson,
    confirmTokenCreation,
    confirmTokenMint,
    confirmNftCreation,
    signTransaction,
    confirmUpdateToken,
    sendTransaction,
    confirmMintNFT,
    getRecommendedFee,
  };
};

export default SysTransactionsController;