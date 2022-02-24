import { web3Provider } from '../provider/web3Provider';

/**
 * This function should return an Account Object.
 * 
 * Use example: 
 * 
 * ```<button onClick={createAccount}>Create your Account!</button>```
 * 
 * Example of @returns object:
 * 
 * ```
 *      {
        address: '0x00000000000000000000000',
        privateKey: '0x0000000000000000000000000000000000000000000',
        signTransaction: [Function: signTransaction],
        sign: [Function: sign],
        encrypt: [Function: encrypt]
         }
```
 *
 */

export const createAccount = () => web3Provider.eth.accounts.create();
