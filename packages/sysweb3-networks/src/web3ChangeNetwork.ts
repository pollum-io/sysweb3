//@ts-nocheck
import Web3 from "web3";
import { web3Provider, networks } from "./index";

/**
 * This function should change the current network.
 * 
 * @param chainId
 * 
 * Here is the available networks to change:
 * 
  - Syscoin Mainnet (57) and Testnet (5700)
  - Ethereum Mainnet (1)
  - Ethereum Rinkeby (4)
  - Polygon Mainnet (137) and Testnet (80001)
 * 
 * Use example: 
 * 
 * ```
 * <button onClick={changeNetwork(4)}>Change the current network</button>
 * ```
 * 
 * @returns void.
 */

export const changeNetwork = async (chainId: number) => {
  let provider;

  for (let i = 0; i < networks.length; i++) {
    if (networks[i].chainId === chainId) {
      provider = networks[i].url;
      break;
    }
  }

  if (provider === undefined)
    throw new Error("Network not found, try again with a correct one!");

  const { HttpProvider } = Web3.providers;

  web3Provider.setProvider(new HttpProvider(provider));
};
