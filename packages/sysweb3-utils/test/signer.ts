// import sys from 'syscoinjs-lib';

// import {
//   getDecryptedVault,
//   setEncryptedVault,
//   isBase64,
//   GetSigners,
// } from '../src';
// import { PASSWORD, SEED, UNENCRYPTED_VAULT } from './mocks';
// import { sysweb3Di } from '@pollum-io/sysweb3-core';
// import { KeyringManager } from '@pollum-io/sysweb3-keyring';

// describe('signer tests', () => {
//   const keyring = KeyringManager();
//   const storage = sysweb3Di.getStateStorageDb();
//   const signers = new GetSigners();

//   it('should init signers and create account', () => {
//     expect(() => getDecryptedVault()).toThrowError('No vault found.');

//     keyring.validateSeed(SEED);
//     keyring.setWalletPassword(PASSWORD);

//     expect(keyring.checkPassword(PASSWORD)).toBeTruthy();

//     setEncryptedVault(UNENCRYPTED_VAULT);

//     expect(isBase64(storage.get('vault'))).toBeTruthy();

//     signers.init();

//     expect(signers.hd.Signer.accounts.length).toBe(1);
//   });

//   it('should get created account xpub', () => {
//     expect(signers.hd.getAccountXpub()).toBe(
//       'zpub6r7RXJJPEnMSV9BNBNP7ihEb3dJ3RgzAsRN9CHz6i9xXyjQ2XbXZztK2nzUJdK5zJWkpsSv4z5wAdzhvQkJ77CztPa2ssg1kx9KFqZwyNcm'
//     );
//   });

//   it('should get created account data', async () => {
//     const options = 'tokens=nonzero&details=txs';
//     const xpub = signers.hd.getAccountXpub();

//     const { address } = await sys.utils.fetchBackendAccount(
//       signers.hd.blockbookURL,
//       xpub,
//       options,
//       xpub
//     );

//     expect(address).toStrictEqual(xpub);
//   });
// });
