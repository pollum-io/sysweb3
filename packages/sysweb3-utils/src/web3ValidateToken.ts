import { contractInstance } from "./index";
import ERC20ABI from "../../../abi/erc20.json";
import { ITokenValidate } from "../../sysweb3-types/src/ITokenValidate";

export const validateIfTokenExist = async (tokenAddress: string) => {
  try {
    const contract = await contractInstance(ERC20ABI, tokenAddress);

    const [decimals, name, symbol]: ITokenValidate[] = await Promise.all([
      contract.methods.symbol().call(),
      contract.methods.decimals().call(),
      contract.methods.name().call(),
    ]);

    if (decimals && name && symbol) {
      return {
        name: name,
        symbol: symbol,
        decimals: decimals,
      };
    }
  } catch (error) {
    throw new Error("Token not found, verify the Token Contract Address.");
  }
};
