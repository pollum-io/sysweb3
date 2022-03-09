import ERC721Abi from "../../../abi/erc721.json";

import { contractInstance } from "./index";
import axios from "axios";

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

export const getNFTImage = async (
  NFTContractAddress: string,
  tokenId: number
) => {
  try {
    const NFTInfo = await (
      await contractInstance(ERC721Abi, NFTContractAddress)
    ).methods
      .tokenURI(tokenId)
      .call();

    if (NFTInfo) {
      const newURL = String(NFTInfo).replace(
        "ipfs://",
        "https://ipfs.io/ipfs/"
      );

      const fetchValue = await axios.get(newURL);
      return String(fetchValue.data.image).replace(
        "ipfs://",
        "https://ipfs.io/ipfs/"
      );
    }

    return new Error("NFTinfo not found.");
  } catch (error) {
    console.log(
      "Verify current network. Set the same network of NFT contract."
    );
  }
};
