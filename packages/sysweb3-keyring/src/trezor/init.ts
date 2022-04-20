import TrezorConnect from 'trezor-connect';

export const initialize = async () => {
  const trezorConnection = await TrezorConnect.init({
    manifest: {
      appUrl: 'https://paliwallet.com/',
      email: 'pali@pollum.io',
    },
  });

  return trezorConnection;
};
