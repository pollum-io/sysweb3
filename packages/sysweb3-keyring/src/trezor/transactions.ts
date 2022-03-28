// import store from 'state/store';
// import { getConnectedAccount, openNotificationsPopup } from '../utils';
import { ITokenMap, ITxid, address } from '@pollum-io/sysweb3-utils';
import sys from 'syscoinjs-lib';
// import IWalletState, { IAccountState } from 'state/wallet/types';
// import { createAccount } from 'state/vault';
// import { fromZPub } from 'bip84';
// import { IKeyringAccountState } from '../sysweb3/keyring';
// import { ISysTrezorController, ITxid } from 'types/controllers';

const TrezorTransactions = ({ signer, tokens }) => {
  const confirmTokenMint = async ({
    tokenOptions,
    feeRate,
  }: { tokenOptions: ITokenMap, feeRate: number }): Promise<ITxid> => {
    const pendingTransaction = await signer.assetSend(
      { rbf: true },
      tokenOptions,
      await address.getNewChangeAddress(true),
      feeRate,
      signer.getAccountXpub()
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const trezorSigner = new sys.utils.TrezorSigner();

    new sys.SyscoinJSLib(trezorSigner, signer.blockbookURL);

    try {
      const txid = await signer.signAndSend(
        pendingTransaction.psbt,
        pendingTransaction.assets,
        trezorSigner
      );

      return { txid };
    } catch (error: any) {
      throw new Error(error);
    }
  };

  const confirmTokenSend = async ({
    txOptions,
    tokenOptions,
    feeRate,
  }: {
    txOptions: { rbf?: boolean };
    tokenOptions: ITokenMap;
    feeRate: number;
  }): Promise<ITxid> => {
    const pendingTransaction = await signer.assetAllocationSend(
      txOptions,
      tokenOptions,
      await signer.getNewChangeAddress(true),
      feeRate,
      signer.getAccountXpub()
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const trezorSigner = new sys.utils.TrezorSigner();

    new sys.SyscoinJSLib(trezorSigner, signer.blockbookURL);

    try {
      const txid = await signer.signAndSend(
        pendingTransaction.psbt,
        pendingTransaction.assets,
        trezorSigner
      );

      return { txid };
    } catch (error) {
      throw new Error(`Bad Request: Could not create transaction, ${error}`);
    }
  };

  const confirmNativeTokenSend = async ({
    txOptions,
    outputs,
    feeRate,
  }): Promise<ITxid> => {
    const pendingTransaction = await account.signer.createTransaction(
      txOptions,
      await window.controller.address.getNewChangeAddress(true),
      outputs,
      feeRate,
      account.currentAccount?.xpub
    );

    if (!pendingTransaction) {
      throw new Error(
        'Bad Request: Could not create transaction. Invalid or incorrect data provided.'
      );
    }

    const trezorSigner = new sys.utils.TrezorSigner();

    new sys.SyscoinJSLib(trezorSigner, account.signer.blockbookURL);

    try {
      const txid = await account.signer.signAndSend(
        pendingTransaction.psbt,
        pendingTransaction.assets,
        trezorSigner
      );

      account.tx.watchMemPool(account.currentAccount);

      account.setAccountTransactions(txid, account.currentAccount);

      account.tx.clearTemporaryTransaction('sendAsset');

      return { txid };
    } catch (error) {
      throw new Error(`Bad Request: Could not create transaction, ${error}`);
    }
  };

  return {
    getAccountInfo,
    confirmTokenMint,
    confirmTokenSend,
    confirmNativeTokenSend,
  };
};

export default TrezorTransactions;