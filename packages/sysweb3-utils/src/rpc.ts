import { MAX_SAFE_CHAIN_ID } from "./constants";

export const isValidEChainIdForEthNetworks = (chainId: number) => {
  return (
    Number.isSafeInteger(chainId) && chainId > 0 && chainId <= MAX_SAFE_CHAIN_ID
  );
}
