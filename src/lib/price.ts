import { TimedCache, TEN_SECONDS_MS } from "./cache";

export type PriceResult = {
  ethUsd: number;
  updatedAtMs: number;
  fromCache: boolean;
};

const priceCache = new TimedCache<PriceResult>(TEN_SECONDS_MS);
const PRICE_KEY = "ETH_USD";

function getPriceApiUrl(): string {
  const url = process.env.PRICE_API_URL;
  if (!url) {
    throw new Error("PRICE_API_URL not set");
  }
  return url;
}

export async function fetchEthUsd(): Promise<PriceResult> {
  const cached = priceCache.get(PRICE_KEY);
  if (cached) {
    return { ...cached.value, fromCache: true };
  }

  const url = getPriceApiUrl();
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    const stale = priceCache.peek(PRICE_KEY);
    if (stale?.value) return { ...stale.value, fromCache: true };
    throw new Error(`Price fetch failed: ${res.status}`);
  }
  const data = await res.json();
  let ethUsd: number | undefined;
  if (typeof data === "object" && data !== null) {
    const d = data as unknown as { ethUsd?: number; ethereum?: { usd?: number } };
    if (typeof d.ethUsd === "number") ethUsd = d.ethUsd;
    else if (d.ethereum && typeof d.ethereum.usd === "number") ethUsd = d.ethereum.usd;
  }
  if (typeof ethUsd !== "number" || !isFinite(ethUsd)) {
    throw new Error("Invalid price payload");
  }
  const entry = priceCache.set(PRICE_KEY, { ethUsd, updatedAtMs: Date.now(), fromCache: false });
  return entry.value;
}

