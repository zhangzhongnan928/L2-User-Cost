import { JsonRpcProvider } from "ethers";
import chains from "@/chains.json";
import { TimedCache, TEN_SECONDS_MS } from "./cache";

export type ChainConfig = {
  name: string;
  chainId: number;
  rpcEnv: string;
  nativeCurrency: string;
  usdStablecoin?: boolean;
  testnet?: boolean;
  chainType: "evm" | "solana";
  coingeckoId?: string;
};

export type SolanaFeeData = {
  baseFeePerSigLamports: number;
  medianPriorityMicroLamportsPerCu: number;
  estimatedCu: {
    transfer: number;
    tokenTransfer: number;
    tokenMint: number;
    tokenBurn: number;
  };
};

export type ChainGasPrice = {
  name: string;
  chainId: number;
  gasPriceWei: string; // decimal string, "0" for non-EVM
  ok: boolean;
  errors: string[];
  nativeCurrency: string;
  usdStablecoin?: boolean;
  testnet?: boolean;
  chainType: "evm" | "solana";
  coingeckoId?: string;
  solanaFees?: SolanaFeeData;
};

const gasCache = new TimedCache<ChainGasPrice[]>(TEN_SECONDS_MS);
const GAS_KEY = "ALL_CHAIN_GAS";

function getRpcUrl(envKey: string): string | undefined {
  const value = process.env[envKey as keyof NodeJS.ProcessEnv] as string | undefined;
  return value && value.length > 0 ? value : undefined;
}

function makeErrorResult(cfg: ChainConfig, errors: string[]): ChainGasPrice {
  return {
    name: cfg.name,
    chainId: cfg.chainId,
    gasPriceWei: "0",
    ok: false,
    errors,
    nativeCurrency: cfg.nativeCurrency,
    usdStablecoin: cfg.usdStablecoin,
    testnet: cfg.testnet,
    chainType: cfg.chainType,
    coingeckoId: cfg.coingeckoId,
  };
}

async function fetchEvmGasPrice(cfg: ChainConfig, rpcUrl: string): Promise<ChainGasPrice> {
  try {
    const provider = new JsonRpcProvider(rpcUrl, cfg.chainId);
    const gasPriceHex = await provider.send("eth_gasPrice", []);
    const gasPriceWei = BigInt(gasPriceHex).toString();
    return {
      name: cfg.name,
      chainId: cfg.chainId,
      gasPriceWei,
      ok: true,
      errors: [],
      nativeCurrency: cfg.nativeCurrency,
      usdStablecoin: cfg.usdStablecoin,
      testnet: cfg.testnet,
      chainType: cfg.chainType,
      coingeckoId: cfg.coingeckoId,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return makeErrorResult(cfg, [message]);
  }
}

async function fetchSolanaFees(rpcUrl: string): Promise<SolanaFeeData> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getRecentPrioritizationFees",
      params: [],
    }),
  });
  if (!res.ok) throw new Error(`Solana RPC failed: ${res.status}`);
  const data = await res.json();

  const fees: number[] = ((data.result || []) as { prioritizationFee: number }[])
    .map((r) => r.prioritizationFee)
    .filter((f) => f > 0);

  // Use median priority fee from recent slots
  fees.sort((a, b) => a - b);
  const medianPriority = fees.length > 0 ? fees[Math.floor(fees.length / 2)] : 0;

  return {
    baseFeePerSigLamports: 5000,
    medianPriorityMicroLamportsPerCu: medianPriority,
    estimatedCu: {
      transfer: 300,
      tokenTransfer: 5000,
      tokenMint: 5000,
      tokenBurn: 5000,
    },
  };
}

async function fetchSolanaChain(cfg: ChainConfig, rpcUrl: string): Promise<ChainGasPrice> {
  try {
    const solanaFees = await fetchSolanaFees(rpcUrl);
    return {
      name: cfg.name,
      chainId: cfg.chainId,
      gasPriceWei: "0",
      ok: true,
      errors: [],
      nativeCurrency: cfg.nativeCurrency,
      usdStablecoin: cfg.usdStablecoin,
      testnet: cfg.testnet,
      chainType: cfg.chainType,
      coingeckoId: cfg.coingeckoId,
      solanaFees,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return makeErrorResult(cfg, [message]);
  }
}

export async function fetchAllChainGas(): Promise<{ results: ChainGasPrice[]; updatedAtMs: number }> {
  const cached = gasCache.get(GAS_KEY);
  if (cached) {
    return { results: cached.value, updatedAtMs: cached.updatedAtMs };
  }

  const configs = chains as ChainConfig[];
  const now = Date.now();
  const results = await Promise.all(
    configs.map(async (cfg): Promise<ChainGasPrice> => {
      const rpcUrl = getRpcUrl(cfg.rpcEnv);
      if (!rpcUrl) {
        return makeErrorResult(cfg, [`Missing RPC env ${cfg.rpcEnv}`]);
      }

      if (cfg.chainType === "solana") {
        return fetchSolanaChain(cfg, rpcUrl);
      }
      return fetchEvmGasPrice(cfg, rpcUrl);
    }),
  );

  gasCache.set(GAS_KEY, results);
  return { results, updatedAtMs: now };
}
