import { Contract } from 'ethers';

export const getContractInfo = async (contract: Contract) => {
  let DROP_START_TIME,
    MAX_SUPPLY,
    MAX_BATCH_MINT,
    PRICE_PER_TOKEN,
    MINIMUM_LUXY_AMOUNT;

  try {
    const date = await contract.methods.DROP_START_TIME().call();
    DROP_START_TIME = new Date(date * 1000);
  } catch (e) {
    DROP_START_TIME = null;
  }

  try {
    MAX_SUPPLY = await contract.methods.MAX_SUPPLY().call();
  } catch (e) {
    MAX_SUPPLY = null;
  }

  try {
    MAX_BATCH_MINT = await contract.methods.MAX_BATCH_MINT().call();
  } catch (e) {
    MAX_BATCH_MINT = null;
  }

  try {
    PRICE_PER_TOKEN = await contract.methods.PRICE_PER_TOKEN().call();
  } catch (e) {
    PRICE_PER_TOKEN = null;
  }

  try {
    MINIMUM_LUXY_AMOUNT = await contract.methods.MINIMUM_LUXY_AMOUNT().call();
  } catch (e) {
    MINIMUM_LUXY_AMOUNT = null;
  }

  return {
    DROP_START_TIME,
    MAX_SUPPLY,
    MAX_BATCH_MINT,
    PRICE_PER_TOKEN,
  };
};
