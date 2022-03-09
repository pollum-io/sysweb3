"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalance = void 0;
const web3Provider_1 = require("../provider/web3Provider");
const lodash_1 = __importDefault(require("lodash"));
/**
 * This function should return the balance of current account.
 *
 * @param walletAddress
 *
 * Use example:
 *
 * ```
 * <button onClick={getBalance('0x000000000000000000000')}>Get balance!</button>
 * ```
 *
 * Return example:
 *
 * ```
 *     0.24501
 *```
 *
 */
const getBalance = (walletAddress) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const balance = yield web3Provider_1.web3Provider.eth.getBalance(walletAddress);
        const formattedBalance = web3Provider_1.web3Provider.utils.fromWei(balance);
        const roundedBalance = lodash_1.default.floor(parseFloat(formattedBalance), 4);
        return roundedBalance;
    }
    catch (error) {
        console.log(`${error}`);
        return 0;
    }
});
exports.getBalance = getBalance;
