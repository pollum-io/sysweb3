import ERC721Abi from "../../../abi/erc721.json";
import { web3Provider } from "../../sysweb3-networks/src/index";
import { contractInstance } from "../../sysweb3-utils/src/contractInstance";
import axios from "axios";
import { IUserNFT } from "../../sysweb3-types/src/index";

/**
 * This function should return a user NFT object (if account have any NFT).
 * 
 * @param walletAddress 
 * 
 * Use example: 
 * 
 * ```<button onClick={getUserNFT}>Get User Available NFTs in account</button>```
 * 
 * Example of NFT object return:
 * 
 * ```
 *      {
          blockNumber: '14267631',
          timeStamp: '1645689993',
          hash: '0x0000000000000000000000000000000000000000000000000000000',
          nonce: '75',
          blockHash: '0x0000000000000000000000000000000000000000000000000000000',
          from: '0x0000000000000000000000000',
          contractAddress: '0x0000000000000000000000000',
          to: '0x0000000000000000000000000',
          tokenID: '4986',
          tokenName: 'Dead Army Skeleton Klub',
          tokenSymbol: 'DASK',
          tokenDecimal: '0',
          transactionIndex: '65',
          gas: '1668996',
          gasPrice: '69385067140',
          gasUsed: '1668996',
          cumulativeGasUsed: '5446567',
          input: 'deprecated',
          confirmations: '2985'
        }
```
 *
 */

export const getUserNFT = async (walletAddress: string) => {
  try {
    const getUserNFTs = await axios.get(
      `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${walletAddress}&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=3QSU7T49W5YYE248ZRF1CPKPRN7FPRPBKH`
    );

    if (getUserNFTs.data.message === "OK") {
      if (getUserNFTs.data.result !== []) {
        return getUserNFTs.data.result as IUserNFT;
      }
      return null;
    } else {
      return null;
    }
  } catch (error) {
    console.log(error);
  }
};
