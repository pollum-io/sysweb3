import { web3Provider } from "../../sysweb3-networks/src/index";
import { AbiItem } from "web3-utils";

export const contractInstance = async (
  AbiContract: any,
  contractAddress: any
) => {
  return new web3Provider.eth.Contract(
    AbiContract as AbiItem[],
    contractAddress
  );
};
