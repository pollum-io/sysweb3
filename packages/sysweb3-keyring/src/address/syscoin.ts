import { SyscoinHDSigner } from "@pollum-io/sysweb3-utils";

export const SyscoinAddress = ({ hd }: { hd: SyscoinHDSigner }) => {
  /** get new receiving address passing true to skip increment,
   *  this way we always receive a new unused and valid address for
   *  each transaction
   */
  const getValidAddress = () => hd.getNewReceivingAddress(true);

  const getChangeAddress = () => hd.getNewChangeAddress(true);

  return {
    getValidAddress,
    getChangeAddress,
  };
}
