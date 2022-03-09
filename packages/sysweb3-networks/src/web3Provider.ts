//@ts-nocheck
import * as Web3 from "web3";

/**
 * This function should only return a new Web3 Provider Url
 *
 * @returns string
 */

export const web3Provider = new Web3(
  new Web3.providers.HttpProvider("https://rpc.syscoin.org/")
);
