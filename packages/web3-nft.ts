import ERC721Abi from '../abi/erc721.json';
import { web3Provider } from '../provider/web3Provider';
import { contractInstance } from '../utils/contractInstance';
import axios from 'axios';

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

export const getUserNFT = async (walletAddress) => {
  try {
    const getUserNFTs = await axios.get(
      `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${walletAddress}&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=3QSU7T49W5YYE248ZRF1CPKPRN7FPRPBKH`
    );
    if(getUserNFTs.data.message === 'OK'){
      if (getUserNFTs.data.result !== []) {
        return getUserNFTs.data.result;
      }
      return null
    } else{
      return console.log(getUserNFTs.data.message)
    }
    
  } catch (error) {
    console.log(error);
  }
};



/**
 * This function should return a NFT image link.
 * 
 * @param NFTContractAddress 
 * @param tokenId
 * 
 * Use example: 
 * 
 * ```<button onClick={getNFTImage('0x0000000000000000000000000', 1234)}>Get NFT image link</button>```
 * 
 * Returns example:
 * 
 * ```
 * 'https://gateway.pinata.cloud/ipfs/Qmc4DqK9xeoSvtVmTcS6YG3DiWHyfiwQsnwQfzcqAvtmHj'
 * ```
 *
 */

export const getNFTImage = async (NFTContractAddress, tokenId) => {
  try {

    const NFTInfo = await (
      await contractInstance(ERC721Abi, NFTContractAddress)
    ).methods
      .tokenURI(tokenId)
      .call();

    if (NFTInfo) {
      const newURL = String(NFTInfo).replace(
        'ipfs://',
        'https://ipfs.io/ipfs/'
      );

      const fetchValue = await axios.get(newURL);
      return String(fetchValue.data.image).replace(
        'ipfs://',
        'https://ipfs.io/ipfs/'
      );
    }

    return console.log('NFTinfo not found.');

  } catch (error) {
    console.log('Verify current network. Set the same network of NFT contract.');
  }
};
