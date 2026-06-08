import chains from "./chains/chains";
import { useAppKitProvider } from "@reown/appkit/vue";
import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import type { ChainInfo, ContractInfo, EVMInfo } from "./types";

const contracts = import.meta.glob("./contracts/*.json");

// 加载指定名称的json里的内容
export async function loadContract(contractName: string): Promise<ContractInfo | undefined> {
  const contractPath = `./contracts/${contractName}.json`;

  if (contracts[contractPath]) {
    const result = (await contracts[contractPath]()) as { default: ContractInfo };
    return result.default;
  } else {
    console.error("未找到合约:", contractName);
    return undefined;
  }
}

// 根据合约文件名和链ID获取合约地址
export async function getContractAddress(
  contractName: string,
  chainId: number
): Promise<string | undefined> {
  const contract = await loadContract(contractName);
  if (!contract) return undefined;

  const chainName = getChainKeyById(chainId);
  return contract[chainName ? chainName : "ethereum"];
}

// 根据合约文件名获取对应的ABI
export async function getFuncAbi(contractName: string): Promise<any[]> {
  const contract = await loadContract(contractName);
  return contract?.abi || [];
}

// 根据链ID获取链相关的信息
export function getChainById(chainId: number): ChainInfo | undefined {
  return Object.values(chains).find(
    (c) => Number((c as ChainInfo).chainId) === Number(chainId)
  ) as ChainInfo;
}

// 根据链ID获取链信息文件中对应的Key，例：bsc、bscTest
export function getChainKeyById(chainId: number): string | undefined {
  return Object.keys(chains).find(
    (key) => Number(chains[key as keyof typeof chains].chainId) === Number(chainId)
  );
}

// 获取EVM链相关的当前账号信息
export async function getEVMCurrentInfo(): Promise<EVMInfo> {
  const { walletProvider } = useAppKitProvider("eip155");

  // 检查钱包提供者是否可用
  if (!walletProvider) {
    // 钱包未连接时使用 BSC 主网公共 RPC（与 AppKit defaultNetwork 保持一致）
    const defaultChain = chains.bsc;
    console.log("钱包未连接，使用公共 RPC 节点连接", defaultChain.chainName);
    const provider = new JsonRpcProvider(defaultChain.rpcUrl);
    const network = await provider.getNetwork();
    // 公共 RPC 没有 signer，返回 null
    return { network, signer: null, provider };
  }

  const provider = new BrowserProvider(walletProvider as any);
  const network = await provider.getNetwork();
  const signer = await provider.getSigner();
  return { network, signer, provider };
}

// 根据合约文件名称返回合约对象
export async function getContract(contractName: string): Promise<Contract> {
  const { network, signer, provider } = await getEVMCurrentInfo();
  console.log("network", network);

  // 获取合约ABI
  const abi = await getFuncAbi(contractName);

  // 获取合约地址
  const address = await getContractAddress(contractName, Number(network.chainId));

  // 构造合约对象
  if (!address) {
    throw new Error(`Contract address not found for ${contractName}`);
  }

  // 如果有 signer 就使用 signer，否则使用 provider（公共 RPC）
  return new Contract(address, abi, signer || provider);
}

// 检查数据是否为空
export function isNull(data: any): boolean {
  if (typeof data === "boolean") {
    return false;
  }

  if (typeof data === "string") {
    return data.trim() === "";
  }
  return data === "" || data === undefined || data == null;
}

// 根据合约地址返回自定义合约对象
export async function getCustomContract(address: string): Promise<Contract> {
  const { network, signer, provider } = await getEVMCurrentInfo();
  console.log("network", network);

  const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address,uint256) returns (bool)",
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)",
  ];
  const abi = ERC20_ABI;

  // 构造合约对象
  if (!address) {
    throw new Error(`Contract address not found`);
  }

  // 如果有 signer 就使用 signer，否则使用 provider（公共 RPC）
  return new Contract(address, abi, signer || provider);
}
