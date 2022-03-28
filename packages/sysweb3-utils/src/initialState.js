import { INetworkType } from '@pollum-io/sysweb3-utils';
export const initialActiveAccountState = {
    address: '',
    tokens: {},
    balances: {
        [INetworkType.Ethereum]: 0,
        [INetworkType.Syscoin]: 0,
    },
    id: -1,
    isTrezorWallet: false,
    label: 'Account 1',
    transactions: {},
    trezorId: -1,
    xprv: '',
    xpub: '',
    saveTokenInfo() { },
    signTransaction() { },
    signMessage() { },
    getPrivateKey: () => initialActiveAccountState.xprv,
};
export const initialNetworksState = {
    syscoin: {
        0: {
            chainId: 0,
            label: 'Syscoin Mainnet',
            url: 'https://blockbook.elint.services/',
            default: true,
        },
        1: {
            chainId: 1,
            label: 'Syscoin Testnet',
            url: 'https://blockbook-dev.elint.services/',
            default: true,
        },
    },
    ethereum: {
        0: {
            chainId: 0,
            label: 'Kovan',
            url: 'https://blockbook-dev.elint.services/',
            default: true,
        },
    },
};
export const initialWalletState = {
    lastLogin: 0,
    accounts: {},
    activeAccount: initialActiveAccountState,
    networks: initialNetworksState,
    hasEncryptedVault: false,
    version: '2.0.0',
    timer: 5,
    temporaryTransactionState: {
        executing: false,
        type: '',
    },
    activeNetwork: {
        chainId: 57,
        label: 'Syscoin Mainnet',
        url: 'https://blockbook.elint.services/',
        default: true,
    },
    getState: () => initialWalletState,
    activeToken: 'SYS',
};
//# sourceMappingURL=initialState.js.map