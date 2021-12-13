
const fetch = require('node-fetch');
const {PendingTx} = require("@syscoin/syscoin-network");
const { LocalStorage } = require('node-localstorage');
const {syscoinAccount} = require("../dist/cjs/syscoin-account");
const {syscoinMonitor} = require("../dist/cjs/syscoin-monitor");
const {sysDi} = require("@syscoin/syscoin-core");

sysDi.useFetchHttpClient(fetch);
sysDi.useLocalStorageClient(new LocalStorage('./scratch'));

//https://us-central1-syscoin-faucet.cloudfunctions.net/main/api/v1/faucet/main/syscoin1J38gQDYfHUVSAnuygPsbk2FoH3Kt2yaN1bKu?amount=0.001
const FAUCET_URL = 'https://us-central1-syscoin-faucet.cloudfunctions.net/main/api/v1/faucet/main/'
const syscoinAccount = new syscoinAccount();
const syscoinMonitor = new syscoinMonitor(syscoinAccount);

function login() {
    syscoinAccount.loginPrivateKey('d8e6cb2639e5a808a94d758061b3774cd1128d918a7d96ae497f8ff4fdb154c0');
}

async function testFee () {

    login();

    const fee = await syscoinAccount.getFeeRecommendation();

    console.log(fee);
}

async function testLocalStorage () {
    const storage = sysDi.getStateStorageDb();

    //storage.set('hello', 'world');

    const value = storage.get('hello');

    console.log(value);
}

async function testFaucet () {

    login();

    const faucetApi = sysDi.createRestApi(FAUCET_URL);

    const pendingTx = await faucetApi.$get(syscoinAccount.address, { amount: 1/1e4 });

    console.log(JSON.stringify(pendingTx,null,2));

    if (!pendingTx || !pendingTx.amount) {
        console.log('Already request in 24 hrs');
    } else {
        syscoinMonitor.addToMemPoolMonitor(pendingTx);
        console.log(`Received ${pendingTx.amount / 1e8} syscoin`);
    }

    syscoinMonitor.observeMemPoolChange().subscribe((monitorUpdate) => {
        console.log(JSON.stringify(monitorUpdate,null,2));
    });
}

/*
export type syscoinWalletMonitorUpdate = {
  pendingHasConfirmed: boolean;
  transTxs: PendingTx[];
  txChanged: boolean;
}
 */
async function monitorTx () {
    login();

    syscoinMonitor.observeMemPoolChange().subscribe((monitorUpdate) => {
        const status = {
            txChanged: monitorUpdate.txChanged,
            pendingHasConfirmed: monitorUpdate.pendingHasConfirmed,
            tx:{
                pendingMsg: monitorUpdate.transTxs[0]?.pendingMsg, pending: monitorUpdate.transTxs[0]?.pending
            }
        }
        console.log(JSON.stringify(status,null,2));
    });

    syscoinMonitor.startMonitor();
}

//testFee();
// testLocalStorage();
//testFaucet();
monitorTx();
