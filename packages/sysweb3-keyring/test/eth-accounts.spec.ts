// import Web3 from 'web3';

import { ethers } from 'ethers';

import { Web3Accounts } from '../src/eth-manager';
import { initialNetworksState } from '../src/initial-state';
import { KeyringManager } from '../src/keyring-manager';
import { EthereumTransactions } from '../src/transactions/ethereum';
import { FAKE_PASSWORD, SYS_EVM_NETWORK, TX } from './constants';
import { getDecryptedVault, INetwork } from '@pollum-io/sysweb3-utils';

describe('Web3Accounts', () => {
  const web3 = Web3Accounts();
  const txs = EthereumTransactions();
  const keyring = KeyringManager();

  beforeEach(async () => {
    // * set password before creating a new seed phrase
    keyring.setWalletPassword(FAKE_PASSWORD);

    // * create a new seed phrase
    keyring.createSeed();

    // * after setting the password and the seed, create a new wallet
    await keyring.createKeyringVault();

    await keyring.setSignerNetwork(
      initialNetworksState.ethereum[137],
      'ethereum'
    );
  });

  //* getBalance
  it('should get balance for the provided address', async () => {
    const {
      wallet: { activeAccount },
    } = getDecryptedVault();

    const balance = await web3.getBalance(activeAccount.address);

    expect(balance).toStrictEqual(0);
  });

  //* getRecommendedNonce
  it('validate and get nounce', async () => {
    const { address } = await keyring.setSignerNetwork(
      SYS_EVM_NETWORK as INetwork,
      'ethereum'
    );

    const nonce = await txs.getRecommendedNonce(address);

    expect(typeof nonce).toBe('number');
  });

  //* toBigNumber
  it('validate toBigNumber method', () => {
    const toBigNumber = txs.toBigNumber(1);

    expect(toBigNumber._isBigNumber).toBeTruthy();
  });

  //* getFeeDataWithDynamicMaxPriorityFeePerGas
  it('should validate getFeeDataWithDynamicMaxPriorityFeePerGas method', async () => {
    const { maxFeePerGas, maxPriorityFeePerGas } =
      await txs.getFeeDataWithDynamicMaxPriorityFeePerGas();

    expect(maxFeePerGas).toBeDefined();
    expect(maxPriorityFeePerGas).toBeDefined();
    expect(maxFeePerGas._isBigNumber).toBeTruthy();
    expect(maxPriorityFeePerGas._isBigNumber).toBeTruthy();
  });

  //* getTxGasLimit
  it('should validate getTxGasLimit method', async () => {
    const tx = TX;

    tx.value = txs.toBigNumber(tx.value);

    const gasLimit = await txs.getTxGasLimit(tx);

    expect(gasLimit instanceof ethers.BigNumber).toBeTruthy();
  });

  //* sendFormattedTransaction failing
  it('should throws an error if balance is insufficient for sendFormattedTransaction', async () => {
    const tx = TX;

    const {
      wallet: { activeAccount },
    } = getDecryptedVault();

    tx.amount = 0;

    expect(activeAccount.balances.ethereum).toEqual(0);

    await expect(
      txs.sendTransaction({
        ...tx,
        from: activeAccount.address,
      })
    ).rejects.toThrowError();
  });

  //* sendFormattedTransaction success
  it('should throws an error if balance is insufficient for sendFormattedTransaction', async () => {
    const tx = TX;

    const { maxFeePerGas, maxPriorityFeePerGas } =
      await txs.getFeeDataWithDynamicMaxPriorityFeePerGas();

    const {
      wallet: { activeAccount, activeNetwork },
    } = getDecryptedVault();

    expect(activeAccount.balances.ethereum).toEqual(0);

    tx.maxFeePerGas = maxFeePerGas;
    tx.maxPriorityFeePerGas = maxPriorityFeePerGas;
    tx.chainId = activeNetwork.chainId;
    tx.from = activeAccount.address;
    tx.value = 0;

    txs.getTxGasLimit(tx).then((gasLimit) => (tx.gasLimit = gasLimit));

    await expect(txs.sendTransaction(tx)).rejects.toThrowError();
  });

  it('should emulate eth_sign ', async () => {
    const response = txs.ethSign([
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      '0x879a053d4800c6354e76c7985a865d2922c82fb5b3f4577b2fe08b998954f2e0',
    ]);

    expect(response).toBe(
      '0x9f2f4ce0b6dedd5f66aa83caae39b90aaf29ebc18c588610d27301dbd3b2aa2935ba8758757c531e851c92c2f103375906139c77d3fc3f3d3fba81a0063f01631c'
    );
  });

  it('Should emulate personal_sign ', async () => {
    const resp = txs.signPersonalMessage([
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      '0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765',
      'Example password',
    ]);
    expect(resp).toBe(
      '0x1e4c47c96d285648db99bf2bdf691aae354d2beb80ceeeaaffa643d37900bf510ea0f5cd06518fcfc67e607898308de1497b6036ccd343ab17e3f59eb87567e41c'
    );
    const decoded = txs.verifyPersonalMessage(
      '0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765',
      resp
    );
    expect(decoded.toLowerCase()).toBe(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5'.toLowerCase()
    );
  });
  it('Should emulate personal_sign long hash ', async () => {
    const sign = txs.signPersonalMessage([
      '0x57656c636f6d6520746f204c555859210a0a436c69636b20746f207369676e20696e20616e642061636365707420746865204c555859205465726d73206f6620536572766963653a2068747470733a2f2f626574612e6c7578792e696f2f7465726d730a0a5468697320726571756573742077696c6c206e6f742074726967676572206120626c6f636b636861696e207472616e73616374696f6e206f7220636f737420616e792067617320666565732e',
      '0x6a92ef94f6db88098625a30396e0fde7255e97d5',
    ]);
    expect(sign).toBe(
      '0x42061314fa6fc713ba096da709853f762f88836904d266919036f0fab2fecd315398ba775e1dc7e10e88b6e799acc162ce13c956766e59b37630b17dd834b9941b'
    );
  });
  it('Should parse Hex encoded message', async () => {
    const resp = txs.parsePersonalMessage(
      '0x4578616d706c652060706572736f6e616c5f7369676e60206d657373616765'
    );
    expect(resp).toBe('Example `personal_sign` message');
  });
  it('GetEncryptedKey', async () => {
    const resp = txs.getEncryptedPubKey();
    expect(resp).toBe('mg0LYtIw5fefbmqlu6sZ9pJtddfM/6/EEPW56qYwwRU=');
  });

  it('Should emulate eth_signTypedData ', async () => {
    const typedData = [
      { type: 'string', name: 'Message', value: 'Hi, Alice!' },
      { type: 'uint32', name: 'A number', value: '1337' },
    ];
    const resp = txs.signTypedData(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      typedData,
      'V1'
    );
    expect(resp).toBe(
      '0x6fd4f93623d151b487656cd3a0aaaec16aee409c353bad7c1f8eecbbab07b06f51ac8be73d7a2d4bba579505aff7c5a62f91141fee75ff2cbb0c111dcfe589c01b'
    );
    const decodedSig = txs.verifyTypedSignature(typedData, resp, 'V1');
    expect(decodedSig.toLowerCase()).toBe(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5'.toLowerCase()
    );
  });

  it('Should emulate eth_signTypedDataV3', async () => {
    const typedData = JSON.parse(
      '{"types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Person":[{"name":"name","type":"string"},{"name":"wallet","type":"address"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person"},{"name":"contents","type":"string"}]},"primaryType":"Mail","domain":{"name":"Ether Mail","version":"1","chainId":57,"verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC"},"message":{"from":{"name":"Cow","wallet":"0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826"},"to":{"name":"Bob","wallet":"0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB"},"contents":"Hello, Bob!"}}'
    );
    const resp = txs.signTypedData(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      typedData,
      'V3'
    );
    expect(resp).toBe(
      '0xe49406911c08d5c8746636c2edaed9fd923b2d2d5659686352a9a4c897b847d36fc4283c62f387bd306e2fb4d241392c1f2ed519586fa532c31b1c2b0c1f85e11b'
    );
    const decodedSign = txs.verifyTypedSignature(typedData, resp, 'V3');
    expect(decodedSign.toLowerCase()).toBe(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5'.toLowerCase()
    );
  });

  it('Should emulate eth_signTypedDataV4', async () => {
    const typedData = JSON.parse(
      '{"domain":{"chainId":"57","name":"Ether Mail","verifyingContract":"0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC","version":"1"},"message":{"contents":"Hello, Bob!","from":{"name":"Cow","wallets":["0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826","0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF"]},"to":[{"name":"Bob","wallets":["0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB","0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57","0xB0B0b0b0b0b0B000000000000000000000000000"]}]},"primaryType":"Mail","types":{"EIP712Domain":[{"name":"name","type":"string"},{"name":"version","type":"string"},{"name":"chainId","type":"uint256"},{"name":"verifyingContract","type":"address"}],"Group":[{"name":"name","type":"string"},{"name":"members","type":"Person[]"}],"Mail":[{"name":"from","type":"Person"},{"name":"to","type":"Person[]"},{"name":"contents","type":"string"}],"Person":[{"name":"name","type":"string"},{"name":"wallets","type":"address[]"}]}}'
    );
    const resp = txs.signTypedData(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
      typedData,
      'V4'
    );
    expect(resp).toBe(
      '0x3b891678723c3ded564278630ec47ea9d8c1b9f61fba1d00cebbe66a0d6209da45d4cd2c74c3c64526471d4da82d6b3b4c053036cee73efb9a78b49edf621ef51b'
    );
    const decodedSign = txs.verifyTypedSignature(typedData, resp, 'V4');
    expect(decodedSign.toLowerCase()).toBe(
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5'.toLowerCase()
    );
  });

  it('Should decrypt Message', async () => {
    const msgParams = [
      '0x7b2276657273696f6e223a227832353531392d7873616c736132302d706f6c7931333035222c226e6f6e6365223a22386f484d6a372b4846646448662b6e2f795244376f4970623470417373516b59222c22657068656d5075626c69634b6579223a226e44627466567371516d77674666513547416736794e7074456c6131374e4b562b4d5473475533785053673d222c2263697068657274657874223a2232527a38546b5942684548626b357851396e4e784347773836773d3d227d',
      '0x6a92eF94F6Db88098625a30396e0fde7255E97d5',
    ];
    const msg = txs.decryptMessage(msgParams);
    expect(msg).toBe('fty');
  });
});
