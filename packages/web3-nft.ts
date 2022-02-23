import ERC721Abi from '../abi/erc721.json';
import { web3Provider } from '../provider/web3Provider';
import { contractInstance } from '../utils/contractInstance';
import axios from 'axios';

const getNFTInfo = async (NFTAddress: string, tokenId: number) => {
  try {

    const NFTInfo = await (
      await contractInstance(ERC721Abi, NFTAddress)
    ).methods
      .tokenURI(tokenId)
      .call();

    if (NFTInfo) {
      const newValue = String(NFTInfo).replace(
        'ipfs://',
        'https://ipfs.io/ipfs/'
      );

      const fetchValue = await axios.get(newValue);
      return String(fetchValue.data.image).replace(
        'ipfs://',
        'https://ipfs.io/ipfs/'
      );
    }

    return NFTInfo;
  } catch (error) {
    console.log('Verify current network. Set the same network of NFT contract.');
  }
};

getNFTInfo('0x8943c7bac1914c9a7aba750bf2b6b09fd21037e0', 9801).then((r) => console.log(r));
