"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.web3Provider = exports.changeNetwork = void 0;
//@ts-nocheck
const Web3 = require("web3");
const networks_1 = require("../networks/networks");
/**
 * This function should change the current network.
 *
 * @param chainId
 *
 * Here is the available networks to change:
 *
  - Syscoin Mainnet (57) and Testnet (5700)
  - Ethereum Mainnet (1)
  - Ethereum Rinkeby (4)
  - Polygon Mainnet (137) and Testnet (80001)
 *
 * Use example:
 *
 * ```
 * <button onClick={changeNetwork(4)}>Change the current network</button>
 * ```
 *
 * @returns void.
 */
const changeNetwork = (chainId) => __awaiter(void 0, void 0, void 0, function* () {
    let provider;
    for (let i = 0; i < networks_1.networks.length; i++) {
        if (networks_1.networks[i].chainId === chainId) {
            provider = networks_1.networks[i].url;
            break;
        }
    }
    if (provider === undefined)
        throw new Error('Network not found, try again with a correct one!');
    const { HttpProvider } = Web3.providers;
    exports.web3Provider.setProvider(new HttpProvider(provider));
});
exports.changeNetwork = changeNetwork;
exports.web3Provider = new Web3(new Web3.providers.HttpProvider('https://rpc.syscoin.org/'));
