import { JsonRpcProvider, formatUnits } from "ethers";
import chains from "@/chains.json";
import { TimedCache, TEN_SECONDS_MS } from "./cache";

export type ChainConfig = {
  name: string;
  chainId: number;
  rpcEnv: string;
  nativeCurrency: string;
  usdStablecoin?: boolean;
};

export type ChainGasPrice = {
  name: string;
  chainId: number;
  gasPriceWei: string; // decimal string
  ok: boolean;
  errors: string[];
  nativeCurrency: string;
  usdStablecoin?: boolean;
};

const gasCache = new TimedCache<ChainGasPrice[]>(TEN_SECONDS_MS);
const GAS_KEY = "ALL_CHAIN_GAS";

function getRpcUrl(envKey: string): string | undefined {
  const value = process.env[envKey as keyof NodeJS.ProcessEnv] as string | undefined;
  return value && value.length > 0 ? value : undefined;
}

export async function fetchAllChainGas(): Promise<{ results: ChainGasPrice[]; updatedAtMs: number }>
{
  const cached = gasCache.get(GAS_KEY);
  if (cached) {
    return { results: cached.value, updatedAtMs: cached.updatedAtMs };
  }

  const configs = chains as ChainConfig[];
  const now = Date.now();
  const results = await Promise.all(
    configs.map(async (cfg): Promise<ChainGasPrice> => {
      const errors: string[] = [];
      const rpcUrl = getRpcUrl(cfg.rpcEnv);
      if (!rpcUrl) {
        errors.push(`Missing RPC env ${cfg.rpcEnv}`);
        return { 
          name: cfg.name, 
          chainId: cfg.chainId, 
          gasPriceWei: "0", 
          ok: false, 
          errors,
          nativeCurrency: cfg.nativeCurrency,
          usdStablecoin: cfg.usdStablecoin,
        };
      }
      try {
        const provider = new JsonRpcProvider(rpcUrl, cfg.chainId);
        const gasPriceHex = await provider.send("eth_gasPrice", []);
        const gasPriceWei = BigInt(gasPriceHex).toString();
        return {
          name: cfg.name,
          chainId: cfg.chainId,
          gasPriceWei,
          ok: true,
          errors,
          nativeCurrency: cfg.nativeCurrency,
          usdStablecoin: cfg.usdStablecoin,
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push(message);
        return { 
          name: cfg.name, 
          chainId: cfg.chainId, 
          gasPriceWei: "0", 
          ok: false, 
          errors,
          nativeCurrency: cfg.nativeCurrency,
          usdStablecoin: cfg.usdStablecoin,
        };
      }
    })
  );

  gasCache.set(GAS_KEY, results);
  return { results, updatedAtMs: now };
}

export function weiToGweiDecimalString(wei: string): string {
  return formatUnits(wei, 9);
}

