const {SyscoinNetwork} = require("../dist/cjs");

const {sysDi} = require("@syscoin/syscoin-core");
const fetch = require('node-fetch');

sysDi.useFetchHttpClient(fetch);

async function test () {
    //https://www.syscoinexplorer.io/search?term=syscoin2rMPHX4w1cMMjowmewRMjD1in53yRURt6Eijh
    const d = new Date();
    //d.setMinutes(d.getMinutes() - 1);

    console.log(d);
    console.log(d.toLocaleTimeString());

    const network = new SyscoinNetwork();

    network.config({
        id: 'ceres',
        beUrl: 'https://api-be.exchanges.constellationnetwork.io',
        lbUrl: 'http://lb.exchanges.constellationnetwork.io:9000'
    })

    const results = await network.blockExplorerApi.getTransactionsByAddress('syscoin3buDiD1WVT1Z8q3hDGMiWJYbnJEZv8WCeSmHc', 1);//0, "2020-12-24T01:57:00Z")

    console.log(JSON.stringify(results,null,' '));

    console.log(results.length);
}

test();
