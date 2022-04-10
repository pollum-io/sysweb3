const hexRegEx = /^0x[0-9a-f]+$/iu;
const chainIdRegEx = /^0x[1-9a-f]+[0-9a-f]*$/iu;

const isCustomRpcWithInvalidChainId = (chainId: number) => (typeof chainId !== 'string' ||
  !chainIdRegEx.test(chainId));

export const validateEthRpc = (chainId: number) => {
  if (isCustomRpcWithInvalidChainId(chainId)) return new Error(`RPC with invalid chain ID: ${chainId}`);
}

export const validateSysRpc = (chainId: number) => {
  if (isCustomRpcWithInvalidChainId(chainId)) return new Error(`RPC with invalid chain ID: ${chainId}`);

}