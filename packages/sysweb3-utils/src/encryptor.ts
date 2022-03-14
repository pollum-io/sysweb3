import CryptoJS from 'crypto-js';

const decrypt = (encryptedString: string, key: string) =>
  CryptoJS.AES.decrypt(encryptedString, key).toString(CryptoJS.enc.Utf8);

const encrypt = (decryptedString: string, key: string) =>
  CryptoJS.AES.encrypt(decryptedString, key);

export const encryptor = {
  decrypt,
  encrypt,
};
