import bip44Constants from 'bip44-constants';
import { coinsWithDefaultWif } from 'data';
import { coins as trezorSupportedCoins } from 'trezorSupportedCoins';

export const getFormattedBip44Coins = () => {
  const bip44FormattedCoins = bip44Constants.map(
    ([coinType, symbol, name]: IBip44Coin): IBip44FormattedCoin => ({
      coinType,
      symbol,
      name,
    })
  );

  const bip44Coins = bip44FormattedCoins.reduce(
    (prev: IBip44Coin, current: IBip44FormattedCoin) => ({
      ...prev,
      [current.name]: current,
    }),
    {}
  );

  return bip44Coins;
};

export const getCreatedCoins = () => {
  const coinsData: ICoinCreated | any = {};

  for (const coin of coinsWithDefaultWif) {
    const key = coin.name.toLowerCase().replace(' ', '_');

    coinsData[key] = coin;
  }

  return coinsData;
};

export const getByName = (name: string) => {
  const coins = getCreatedCoins();

  const key = name.toLowerCase().replace(' ', '_');

  const current = coins[key];

  return current;
};

export const getSupportedCoins = () => {
  const supported: any = {};

  trezorSupportedCoins.bitcoin.forEach((coin) => {
    const bip44Coins = getFormattedBip44Coins();
    const currency = bip44Coins[coin.name];
    const currencyByName = getByName(coin.name);

    if (currencyByName && currency) {
      supported[currency.coinType] = {
        ...currency,
        ...coin,
        ...currencyByName,
      };
    }
  });

  return supported;
};

export type ICoinCreated = {
  name: string;
  networkVersion: number | number[];
  wif: number;
  wifStart: string;
  cWifStart: string;
};

export type IBip44Coin = [number, string, string];
export type IBip44FormattedCoin = {
  coinType: number;
  symbol: string;
  name: string;
};
