import chains from "./chains";
import { defineChain } from "@reown/appkit/networks";

export const bscTestnet = defineChain({
  id: chains.bscTest.chainId,
  caipNetworkId: `eip155:${chains.bscTest.chainId}`,
  chainNamespace: "eip155",
  name: chains.bscTest.chainName,
  nativeCurrency: {
    name: chains.bscTest.coinName,
    symbol: chains.bscTest.coinSymbol,
    decimals: chains.bscTest.coinDecimals,
  },
  rpcUrls: {
    default: {
      http: [chains.bscTest.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "BscScan Testnet",
      url: chains.bscTest.blockExplorerUrl,
    },
  },
});
