import ERC721Abi from '../abi/erc721.json';
import { web3Provider } from '../provider/web3Provider';
import { contractInstance } from '../utils/contractInstance';
import axios from 'axios';

const getNFTImage = async (NFTAddress, tokenId) => {
  try {

    const NFTInfo = await (
      await contractInstance(ERC721Abi, NFTAddress)
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

getNFTImage('0x2250d7c238392f4b575bb26c672afe45f0adcb75', 12100030213).then((r) => console.log(r));
