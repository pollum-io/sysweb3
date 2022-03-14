import { web3Provider } from "../../sysweb3-networks/src/index";


export const RpcVerifier = () => {
    return web3Provider.eth.net.isListening((err, res) => {
      if (err) {
        return console.error({
          message: 'Check the current RPC. Maybe is not a valid RPC.',
          valid: res === undefined ? false : null,
        });
      }
      console.log({
        message: 'The current RPC is working correctly.',
        valid: res,
      });
    });
  };