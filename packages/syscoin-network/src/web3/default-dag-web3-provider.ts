import {BlockExplorerApi, LoadBalancerApi} from "../api";
import {NetworkInfo} from "../types";
import {globalSyscoinNetwork} from "../global-syscoin-network";
import {Transaction} from "../dto";

export class DefaultsyscoinWeb3Provider {

    private loadBalancerApi = new LoadBalancerApi();
    private blockExplorerApi = new BlockExplorerApi();
    private connectedNetwork: NetworkInfo;

    constructor(netInfo?: NetworkInfo) {
        if (netInfo) {
            this.setNetwork(netInfo);
        }
    }

    config(netInfo?: NetworkInfo) {
        if (netInfo) {
            this.setNetwork(netInfo);
        }
        else {
            return this.connectedNetwork;
        }
    }

    setNetwork(netInfo: NetworkInfo) {
        if (this.connectedNetwork !== netInfo) {

            this.connectedNetwork = netInfo;

            if (!this.blockExplorerApi) {
                this.loadBalancerApi = new LoadBalancerApi();
                this.blockExplorerApi = new BlockExplorerApi();
            }

            this.blockExplorerApi.config().baseUrl(netInfo.beUrl);
            this.loadBalancerApi.config().baseUrl(netInfo.lbUrl);
        }
    }

    async getBalance(address: string) {
        const balObj = await this.getLoadBalancerApi().getAddressBalance(address);
        return balObj.balance;
    }

    async getTransactionCount(address: string) {
        const balObj = await this.getLoadBalancerApi().getAddressLastAcceptedTransactionRef(address);
        return balObj.ordinal;
    }

    async getTransactionHistory (address: string, limit = 100): Promise<Transaction[]> {
        return this.getBlockExplorerApi().getTransactionsByAddress(address, limit);
    }

    async getTokenTransactionHistory (address: string, limit = 100): Promise<Transaction[]> {
        return [];
    }

    async getTokenAddressBalances (addresses: string[], tokenContractAddress?: string[]) {
        return {};
    }

    private getLoadBalancerApi() {
        return this.loadBalancerApi || globalSyscoinNetwork.loadBalancerApi;
    }

    private getBlockExplorerApi() {
        return this.blockExplorerApi || globalSyscoinNetwork.blockExplorerApi;
    }

}