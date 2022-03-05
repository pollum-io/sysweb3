"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNFTImage = exports.getUserNFT = void 0;
const erc721_json_1 = __importDefault(require("../abi/erc721.json"));
const contractInstance_1 = require("../utils/contractInstance");
const axios_1 = __importDefault(require("axios"));
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
const getUserNFT = (walletAddress) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const getUserNFTs = yield axios_1.default.get(`https://api.etherscan.io/api?module=account&action=tokennfttx&address=${walletAddress}&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=3QSU7T49W5YYE248ZRF1CPKPRN7FPRPBKH`);
        if (getUserNFTs.data.message === 'OK') {
            if (getUserNFTs.data.result !== []) {
                return getUserNFTs.data.result;
            }
            return null;
        }
        else {
            return null;
        }
    }
    catch (error) {
        console.log(error);
    }
});
exports.getUserNFT = getUserNFT;
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
const getNFTImage = (NFTContractAddress, tokenId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const NFTInfo = yield (yield (0, contractInstance_1.contractInstance)(erc721_json_1.default, NFTContractAddress)).methods
            .tokenURI(tokenId)
            .call();
        if (NFTInfo) {
            const newURL = String(NFTInfo).replace('ipfs://', 'https://ipfs.io/ipfs/');
            const fetchValue = yield axios_1.default.get(newURL);
            return String(fetchValue.data.image).replace('ipfs://', 'https://ipfs.io/ipfs/');
        }
        return new Error('NFTinfo not found.');
    }
    catch (error) {
        console.log('Verify current network. Set the same network of NFT contract.');
    }
});
exports.getNFTImage = getNFTImage;
