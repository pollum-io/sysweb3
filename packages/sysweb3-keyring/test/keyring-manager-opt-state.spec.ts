import { INetworkType } from '@pollum-io/sysweb3-network/src';
import { initialWalletState } from '../src/initial-state';
import { KeyringManager } from '../src/keyring-manager';
import { KeyringAccountType } from '../src/types';
import { FAKE_PASSWORD, PEACE_SEED_PHRASE } from './constants';
/**
 * export interface IkeyringManagerOpts {
  wallet?: IWalletState | null;
  activeChain?: INetworkType | null;
  //todo: other props
}
 */

/**
 * export interface IWalletState {
  accounts: { [key in KeyringAccountType]: accountType };
  activeAccountId: number;
  activeAccountType: KeyringAccountType;
  networks: {
    [INetworkType.Ethereum]: {
      [chainId: number | string]: INetwork;
    };
    [INetworkType.Syscoin]: {
      [chainId: number | string]: INetwork;
    };
  };
  activeNetwork: INetwork;
}
 */

/** network chain opt
 * export enum INetworkType {
  Ethereum = 'ethereum',
  Syscoin = 'syscoin',
}
 */
describe('testing functions for the new-sys txs', () => {
  //--------------------------------------------------------Tests for initialize wallet state----------------------------------------------------

  it('should initialize a new keyring with eth as the active chain', () => {
    const keyringManager = new KeyringManager({
      activeChain: INetworkType.Ethereum,
    });
    const activeChain = keyringManager.activeChain;
    expect(activeChain).toBe(INetworkType.Ethereum);
  });

  it('should initialize a new keyring with sys as the active chain', () => {
    const keyringManager = new KeyringManager({
      activeChain: INetworkType.Syscoin,
    });
    const activeChain = keyringManager.activeChain;
    expect(activeChain).toBe(INetworkType.Syscoin);
  });

  it('should initialize a new keyring with activeAccount 1 instead', () => {
    const activeAccountId = 1;
    const keyringManager = new KeyringManager({
      wallet: {
        ...initialWalletState,
        activeAccountId: 1,
      },
    });
    const walletActiveAccountId = keyringManager.getState().activeAccountId;

    expect(walletActiveAccountId).toBe(activeAccountId);
  });

  it('should initialize a new keyring with activeAccount 1 instead', () => {
    const activeAccountId = 1;
    const keyringManager = new KeyringManager({
      wallet: {
        ...initialWalletState,
        activeAccountId: 1,
      },
    });
    const walletActiveAccountId = keyringManager.getState().activeAccountId;

    expect(walletActiveAccountId).toBe(activeAccountId);
  });

  it('should initialize a new keyring with a imported account type ', () => {
    const keyringManager = new KeyringManager({
      wallet: {
        ...initialWalletState,
        activeAccountType: KeyringAccountType.Imported,
      },
    });
    const walletActiveAccountType = keyringManager.getState().activeAccountType;

    expect(walletActiveAccountType).toBe(KeyringAccountType.Imported);
  });
});
