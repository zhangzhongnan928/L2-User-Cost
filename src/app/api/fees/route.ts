import { NextResponse } from "next/server";
import { fetchTokenPrices } from "@/lib/price";
import { fetchAllChainGas } from "@/lib/rpc";
import chains from "@/chains.json";

export const revalidate = 0;

export async function GET(): Promise<Response> {
  try {
    const coingeckoIds = [
      ...new Set(
        (chains as Array<{ coingeckoId?: string }>)
          .map((c) => c.coingeckoId)
          .filter((id): id is string => !!id),
      ),
    ];

    const [priceResult, gas] = await Promise.all([
      fetchTokenPrices(coingeckoIds),
      fetchAllChainGas(),
    ]);

    const body = {
      prices: priceResult.prices,
      updatedAt: Math.min(priceResult.updatedAtMs, gas.updatedAtMs),
      chains: gas.results,
      usingCachedPrice: priceResult.fromCache,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
