"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { calcFeeUsd } from "@/lib/units";

type ApiChain = {
  name: string;
  chainId: number;
  gasPriceWei: string;
  ok: boolean;
  errors: string[];
};

type ApiResponse = {
  ethUsd: number;
  updatedAt: number;
  usingCachedPrice?: boolean;
  chains: ApiChain[];
};

const DEFAULTS = {
  ethTransfer: 21_000,
  erc20Transfer: 50_000,
  erc20Mint: 36_500,
  erc20Burn: 36_500,
};

function classForUsd(value: number): string {
  if (value < 0.01) return "text-gray-400";
  if (value <= 0.1) return "text-green-600";
  return "text-orange-600";
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CostTable() {
  const [intervalMs, setIntervalMs] = useState(10_000);
  const [erc20TransferGas, setErc20TransferGas] = useState(DEFAULTS.erc20Transfer);
  const { data, isLoading, mutate } = useSWR<ApiResponse>("/api/fees", fetcher, {
    refreshInterval: intervalMs,
    revalidateOnFocus: false,
  });

  const updatedAtText = useMemo(() => {
    if (!data?.updatedAt) return "";
    const d = new Date(data.updatedAt);
    return d.toLocaleTimeString();
  }, [data?.updatedAt]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {data?.usingCachedPrice ? "Using cached price" : ""}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
            onClick={() => mutate()}
          >
            Refresh
          </button>
          <label className="flex items-center gap-2">
            <span>Auto refresh</span>
            <select
              className="border rounded px-2 py-1"
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
            >
              <option value={0}>Off</option>
              <option value={5_000}>5s</option>
              <option value={10_000}>10s</option>
              <option value={30_000}>30s</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span>ERC20 transfer gasUsed</span>
            <input
              type="number"
              className="w-28 border rounded px-2 py-1"
              value={erc20TransferGas}
              onChange={(e) => setErc20TransferGas(Number(e.target.value) || DEFAULTS.erc20Transfer)}
              min={10_000}
              step={500}
            />
          </label>
          <div className="text-xs text-gray-500">Updated {updatedAtText}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Chain</th>
              <th className="py-2 pr-4">Gas Price (gwei)</th>
              <th className="py-2 pr-4">ETH/USD</th>
              <th className="py-2 pr-4">ETH Transfer (USD)</th>
              <th className="py-2 pr-4">ERC20 Transfer (USD)</th>
              <th className="py-2 pr-4">ERC20 Mint (USD)</th>
              <th className="py-2 pr-4">ERC20 Burn (USD)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="py-3" colSpan={7}>Loading...</td>
              </tr>
            )}
            {data?.chains.map((c) => {
              const gasGwei = Number(BigInt(c.gasPriceWei)) / 1_000_000_000;
              const ethUsd = data.ethUsd;
              const ethTxUsd = c.ok ? calcFeeUsd(DEFAULTS.ethTransfer, c.gasPriceWei, ethUsd) : NaN;
              const erc20TxUsd = c.ok ? calcFeeUsd(erc20TransferGas, c.gasPriceWei, ethUsd) : NaN;
              const mintUsd = c.ok ? calcFeeUsd(DEFAULTS.erc20Mint, c.gasPriceWei, ethUsd) : NaN;
              const burnUsd = c.ok ? calcFeeUsd(DEFAULTS.erc20Burn, c.gasPriceWei, ethUsd) : NaN;

              return (
                <tr key={c.chainId} className="border-b">
                  <td className="py-2 pr-4">{c.name}</td>
                  <td className="py-2 pr-4">{c.ok ? gasGwei.toFixed(2) : "N/A"}</td>
                  <td className="py-2 pr-4">{data.ethUsd?.toFixed(2)}</td>
                  <td className={`py-2 pr-4 ${c.ok ? classForUsd(ethTxUsd) : ""}`}>
                    {c.ok ? `$${ethTxUsd.toFixed(2)}` : "N/A"}
                  </td>
                  <td className={`py-2 pr-4 ${c.ok ? classForUsd(erc20TxUsd) : ""}`}>
                    {c.ok ? `$${erc20TxUsd.toFixed(2)}` : "N/A"}
                  </td>
                  <td className={`py-2 pr-4 ${c.ok ? classForUsd(mintUsd) : ""}`}>
                    {c.ok ? `$${mintUsd.toFixed(2)}` : "N/A"}
                  </td>
                  <td className={`py-2 pr-4 ${c.ok ? classForUsd(burnUsd) : ""}`}>
                    {c.ok ? `$${burnUsd.toFixed(2)}` : "N/A"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

