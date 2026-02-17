import { TimedCache, TEN_SECONDS_MS } from "./cache";

export type PricesResult = {
  prices: Record<string, number>; // coingeckoId → USD
  updatedAtMs: number;
  fromCache: boolean;
};

const priceCache = new TimedCache<PricesResult>(TEN_SECONDS_MS);
const PRICES_KEY = "TOKEN_PRICES";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3/simple/price";

export async function fetchTokenPrices(coingeckoIds: string[]): Promise<PricesResult> {
  const cached = priceCache.get(PRICES_KEY);
  if (cached) {
    return { ...cached.value, fromCache: true };
  }

  const uniqueIds = [...new Set(coingeckoIds)];
  const url = `${COINGECKO_BASE}?ids=${uniqueIds.join(",")}&vs_currencies=usd`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    const stale = priceCache.peek(PRICES_KEY);
    if (stale?.value) return { ...stale.value, fromCache: true };
    throw new Error(`Price fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as Record<string, { usd?: number }>;
  const prices: Record<string, number> = {};

  for (const id of uniqueIds) {
    const usd = data[id]?.usd;
    if (typeof usd === "number" && isFinite(usd)) {
      prices[id] = usd;
    }
  }

  if (Object.keys(prices).length === 0) {
    throw new Error("No valid prices in response");
  }

  const result: PricesResult = { prices, updatedAtMs: Date.now(), fromCache: false };
  priceCache.set(PRICES_KEY, result);
  return result;
}
