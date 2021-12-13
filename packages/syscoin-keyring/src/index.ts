import { keyringRegistry } from './keyring-registry';
import { KeyringNetwork } from './kcs';
import { EthAccount } from './accounts/eth-account';
import { SyscoinAccount } from './accounts/syscoin-account';

export * from './bip39-helper';
export * from './keyring-manager';
export * from './rings';
export * from './kcs';

export { Web3Provider } from './web3/Web3Provider'
export { Encryptor } from './encryptor';
export { keyringRegistry } from './keyring-registry';
export * from './wallets';

keyringRegistry.registerAccountClass(KeyringNetwork.Ethereum, EthAccount);
keyringRegistry.registerAccountClass(KeyringNetwork.Syscoin, SyscoinAccount);
