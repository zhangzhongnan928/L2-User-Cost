import { NextResponse } from "next/server";
import { fetchEthUsd } from "@/lib/price";
import { fetchAllChainGas } from "@/lib/rpc";

export const revalidate = 0;

export async function GET(): Promise<Response> {
  try {
    const [price, gas] = await Promise.all([fetchEthUsd(), fetchAllChainGas()]);
    const body = {
      ethUsd: price.ethUsd,
      updatedAt: Math.min(price.updatedAtMs, gas.updatedAtMs),
      chains: gas.results,
      usingCachedPrice: price.fromCache,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

