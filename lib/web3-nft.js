"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getUserNFT = exports.getNFTImage = void 0;

require("core-js/modules/es.promise.js");

require("core-js/modules/es.regexp.exec.js");

require("core-js/modules/es.string.replace.js");

var _erc = _interopRequireDefault(require("../abi/erc721.json"));

var _contractInstance = require("../utils/contractInstance");

var _axios = _interopRequireDefault(require("axios"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
const getUserNFT = async walletAddress => {
  try {
    const getUserNFTs = await _axios.default.get("https://api.etherscan.io/api?module=account&action=tokennfttx&address=".concat(walletAddress, "&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=3QSU7T49W5YYE248ZRF1CPKPRN7FPRPBKH"));

    if (getUserNFTs.data.message === 'OK') {
      if (getUserNFTs.data.result !== []) {
        return getUserNFTs.data.result;
      }

      return null;
    } else {
      return null;
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


exports.getUserNFT = getUserNFT;

const getNFTImage = async (NFTContractAddress, tokenId) => {
  try {
    const NFTInfo = await (await (0, _contractInstance.contractInstance)(_erc.default, NFTContractAddress)).methods.tokenURI(tokenId).call();

    if (NFTInfo) {
      const newURL = String(NFTInfo).replace('ipfs://', 'https://ipfs.io/ipfs/');
      const fetchValue = await _axios.default.get(newURL);
      return String(fetchValue.data.image).replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    return new Error('NFTinfo not found.');
  } catch (error) {
    console.log('Verify current network. Set the same network of NFT contract.');
  }
};

exports.getNFTImage = getNFTImage;