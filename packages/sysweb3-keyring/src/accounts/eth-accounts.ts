// @ts-ignore
import { web3Provider } from "@pollum-io/sysweb3-network";
import axios from "axios";
import crypto from "crypto-js";
import { ethers } from "ethers";
import { request, gql } from "graphql-request";
import _ from "lodash";
import { Account, TransactionReceipt } from "web3-core";

export const Web3Accounts = () => {
  const createAccount = (): Account => web3Provider.eth.accounts.create();

  const getBalance = async (address: string): Promise<number> => {
    try {
      const balance = await web3Provider.eth.getBalance(address);
      const formattedBalance = web3Provider.utils.fromWei(balance);

      const roundedBalance = _.floor(parseFloat(formattedBalance), 4);

      return roundedBalance;
    } catch (error) {
      // todo: handle error
      console.log(`${error}`);

      return 0;
    }
  };

  const getNftsByAddress = async (
    address: string
  ): Promise<object | undefined> => {
    try {
      const { data } = await axios.get(
        `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${address}&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=3QSU7T49W5YYE248ZRF1CPKPRN7FPRPBKH`
      );

      if (data.message === "OK" && data.result !== []) {
        return data.result;
      }

      return;
    } catch (error) {
      // todo: handle error
      console.log(error);
      throw error;
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
        url: "https://graphql.bitquery.io/",
        document: query,
        requestHeaders: {
          "X-API-KEY": "BQYvhnv04csZHaprIBZNwtpRiDIwEIW9",
        },
      });

      if (ethereum.address[0].balances) {
        return ethereum.address[0].balances;
      }
    } catch (error) {
      // todo: handle error
      throw new Error("Not available tokens");
    }
  };

  const sendTransaction = async (
    fromAddress: string,
    fromPrivateKey: string,
    toAddress: string,
    value: number,
    gasFee?: string
  ) => {
    const gasPrice = (await web3Provider.eth.getGasPrice()).toString();

    let editGasFee: any;

    switch (gasFee) {
      case "low":
        editGasFee = web3Provider.utils
          .toBN(gasPrice)
          .mul(web3Provider.utils.toBN(8))
          .div(web3Provider.utils.toBN(10))
          .toString();

        break;
      case "high":
        editGasFee = web3Provider.utils
          .toBN(gasPrice)
          .mul(web3Provider.utils.toBN(11))
          .div(web3Provider.utils.toBN(10))
          .toString();
        break;
      default:
        editGasFee = gasPrice;
        break;
    }

    const signedTransaction = await web3Provider.eth.accounts.signTransaction(
      {
        from: fromAddress,
        to: toAddress,
        value: web3Provider.utils.toWei(value.toString(), "ether"),
        gas: await web3Provider.eth.estimateGas({
          to: toAddress,
        }),
        gasPrice: editGasFee,
        nonce: await web3Provider.eth.getTransactionCount(
          fromAddress,
          "latest"
        ),
      },
      fromPrivateKey
    );

    try {
      return web3Provider.eth
        .sendSignedTransaction(`${signedTransaction.rawTransaction}`)
        .then((result: TransactionReceipt) => result);
    } catch (error: any) {
      throw new Error(error);
    }
  };

  const importAccount = (mnemonic: string, password: string): Account => {
    try {
      if (web3Provider.utils.isHexStrict(mnemonic)) {
        return web3Provider.eth.accounts.privateKeyToAccount(mnemonic);
      }

      const decryptedMnemonic = crypto.AES.decrypt(mnemonic, password).toString(
        crypto.enc.Utf8
      );

      const { privateKey } = ethers.Wallet.fromMnemonic(decryptedMnemonic);

      const account = web3Provider.eth.accounts.privateKeyToAccount(privateKey);

      return account;
    } catch (error) {
      // todo: handle
      console.log(error);
      throw error;
    }
  };

  return {
    createAccount,
    getBalance,
    getNftsByAddress,
    getTokens,
    sendTransaction,
    importAccount,
  };
};
