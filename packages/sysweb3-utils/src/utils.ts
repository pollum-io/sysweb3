import { AbiItem } from 'web3-utils';

export async function isERC721Token(
  contractAddress: string,
  web3Provider: any,
  abi721: AbiItem[]
) {
  try {
    const contract = new web3Provider.eth.Contract(abi721, contractAddress);
    const name = await contract.methods.name().call();
    const symbol = await contract.methods.symbol().call();
    const totalSupply = await contract.methods.totalSupply().call();

    return { isERC721: true, name, symbol, totalSupply };
  } catch (err) {
    throw new Error('Contract is not an ERC721 token');
  }
}

export async function isERC20Token(
  contractAddress: string,
  web3Provider: any,
  abi20: AbiItem[]
) {
  try {
    const contract = new web3Provider.eth.Contract(abi20, contractAddress);
    const symbol = await contract.methods.symbol().call();
    const name = await contract.methods.name().call();
    const decimals = await contract.methods.decimals().call();

    return { isERC20: true, symbol, name, decimals };
  } catch (err) {
    throw new Error('Contract is not an ERC20 token');
  }
}
