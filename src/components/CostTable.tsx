"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { calcFeeUsd } from "@/lib/units";
import { Settings } from "@/components/Settings";

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
  customGas: 100_000,
};

function classForUsd(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (value <= 0.01) return "text-black";
  return "text-red-600";
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CostTable() {
  const [intervalMs, setIntervalMs] = useState(10_000);
  const [erc20TransferGas, setErc20TransferGas] = useState(DEFAULTS.erc20Transfer);
  const [customGas, setCustomGas] = useState(DEFAULTS.customGas);
  type SortKey = "name" | "gasGwei" | "ethUsd" | "ethTxUsd" | "erc20TxUsd" | "mintUsd" | "burnUsd" | "customUsd";
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const { data, isLoading, mutate } = useSWR<ApiResponse>("/api/fees", fetcher, {
    refreshInterval: intervalMs,
    revalidateOnFocus: false,
  });

  const updatedAtText = useMemo(() => {
    if (!data?.updatedAt) return "";
    const d = new Date(data.updatedAt);
    return d.toLocaleTimeString();
  }, [data?.updatedAt]);

  const rows = useMemo(() => {
    if (!data?.chains) return [] as Array<{
      chain: ApiChain;
      gasGwei: number;
      ethUsd: number;
      ethTxUsd: number;
      erc20TxUsd: number;
      mintUsd: number;
      burnUsd: number;
      customUsd: number;
      ethTxEth: number;
      erc20TxEth: number;
      mintEth: number;
      burnEth: number;
      customEth: number;
    }>;
    return data.chains.map((c) => {
      const gasGwei = c.ok ? Number(BigInt(c.gasPriceWei)) / 1_000_000_000 : Number.NaN;
      const ethUsd = data.ethUsd;
      const ethTxUsd = c.ok ? calcFeeUsd(DEFAULTS.ethTransfer, c.gasPriceWei, ethUsd) : Number.NaN;
      const erc20TxUsd = c.ok ? calcFeeUsd(erc20TransferGas, c.gasPriceWei, ethUsd) : Number.NaN;
      const mintUsd = c.ok ? calcFeeUsd(DEFAULTS.erc20Mint, c.gasPriceWei, ethUsd) : Number.NaN;
      const burnUsd = c.ok ? calcFeeUsd(DEFAULTS.erc20Burn, c.gasPriceWei, ethUsd) : Number.NaN;
      const customUsd = c.ok ? calcFeeUsd(customGas, c.gasPriceWei, ethUsd) : Number.NaN;
      const gasWei = c.ok ? Number(BigInt(c.gasPriceWei)) : 0;
      const ethTxEth = c.ok ? (DEFAULTS.ethTransfer * gasWei / 1e18) : Number.NaN;
      const erc20TxEth = c.ok ? (erc20TransferGas * gasWei / 1e18) : Number.NaN;
      const mintEth = c.ok ? (DEFAULTS.erc20Mint * gasWei / 1e18) : Number.NaN;
      const burnEth = c.ok ? (DEFAULTS.erc20Burn * gasWei / 1e18) : Number.NaN;
      const customEth = c.ok ? (customGas * gasWei / 1e18) : Number.NaN;
      return { chain: c, gasGwei, ethUsd, ethTxUsd, erc20TxUsd, mintUsd, burnUsd, customUsd, ethTxEth, erc20TxEth, mintEth, burnEth, customEth };
    });
  }, [data?.chains, data?.ethUsd, erc20TransferGas, customGas]);

  function getRowValue(row: (typeof rows)[number]): number | string {
    switch (sortKey) {
      case "name":
        return row.chain.name.toLowerCase();
      case "gasGwei":
        return row.gasGwei;
      case "ethUsd":
        return row.ethUsd;
      case "ethTxUsd":
        return row.ethTxUsd;
      case "erc20TxUsd":
        return row.erc20TxUsd;
      case "mintUsd":
        return row.mintUsd;
      case "burnUsd":
        return row.burnUsd;
      case "customUsd":
        return row.customUsd;
    }
  }

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = getRowValue(a);
      const bv = getRowValue(b);
      // Name string compare
      if (typeof av === "string" && typeof bv === "string") {
        const cmp = av.localeCompare(bv);
        return sortDir === "asc" ? cmp : -cmp;
      }
      // Numeric compare (push NaN to bottom regardless of dir)
      const aNum = Number(av);
      const bNum = Number(bv);
      const aIsNaN = !Number.isFinite(aNum);
      const bIsNaN = !Number.isFinite(bNum);
      if (aIsNaN && bIsNaN) return 0;
      if (aIsNaN) return 1;
      if (bIsNaN) return -1;
      return sortDir === "asc" ? aNum - bNum : bNum - aNum;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function header(label: string, key: SortKey) {
    const active = sortKey === key;
    const arrow = active ? (sortDir === "asc" ? "▲" : "▼") : "";
    return (
      <button
        className="inline-flex items-center gap-1 select-none cursor-pointer"
        onClick={() => {
          if (active) setSortDir(sortDir === "asc" ? "desc" : "asc");
          else {
            setSortKey(key);
            setSortDir("asc");
          }
        }}
        type="button"
      >
        <span>{label}</span>
        <span className="text-gray-500 text-[11px]">{arrow}</span>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 whitespace-nowrap">Custom Gas:</span>
            <input
              type="number"
              className="w-28 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={customGas}
              onChange={(e) => setCustomGas(Math.max(0, Number(e.target.value) || 0))}
              min={0}
              step={1000}
              placeholder="100000"
            />
          </label>
          <div className="text-sm text-gray-500">
            {data?.usingCachedPrice ? "Using cached price" : ""}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
            onClick={() => mutate()}
          >
            Refresh
          </button>
          <Settings
            value={{ intervalMs, erc20TransferGas }}
            onChange={({ intervalMs: i, erc20TransferGas: g }) => {
              setIntervalMs(i);
              setErc20TransferGas(g);
            }}
          />
          <div className="text-xs text-gray-500">Updated {updatedAtText}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">{header("Chain", "name")}</th>
              <th className="py-2 pr-4">{header("Gas Price (gwei)", "gasGwei")}</th>
              <th className="py-2 pr-4">{header("ETH/USD", "ethUsd")}</th>
              <th className="py-2 pr-4">{header("ETH Transfer (USD)", "ethTxUsd")}</th>
              <th className="py-2 pr-4">{header("ERC20 Transfer (USD)", "erc20TxUsd")}</th>
              <th className="py-2 pr-4">{header("ERC20 Mint (USD)", "mintUsd")}</th>
              <th className="py-2 pr-4">{header("ERC20 Burn (USD)", "burnUsd")}</th>
              <th className="py-2 pr-4 bg-blue-50">{header(`Custom TX (USD)`, "customUsd")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="py-3" colSpan={8}>Loading...</td>
              </tr>
            )}
            {sortedRows.map((row) => (
              <tr key={row.chain.chainId} className="border-b">
                <td className="py-2 pr-4">{row.chain.name}</td>
                <td className="py-2 pr-4">{row.chain.ok ? row.gasGwei.toFixed(8) : "N/A"}</td>
                <td className="py-2 pr-4">{row.ethUsd?.toFixed(4)}</td>
                <td className={`py-2 pr-4 ${row.chain.ok ? classForUsd(row.ethTxUsd) : ""}`} title={row.chain.ok ? `${row.ethTxEth.toFixed(8)} ETH` : ""}>
                  {row.chain.ok ? `$${row.ethTxUsd.toFixed(4)}` : "N/A"}
                </td>
                <td className={`py-2 pr-4 ${row.chain.ok ? classForUsd(row.erc20TxUsd) : ""}`} title={row.chain.ok ? `${row.erc20TxEth.toFixed(8)} ETH` : ""}>
                  {row.chain.ok ? `$${row.erc20TxUsd.toFixed(4)}` : "N/A"}
                </td>
                <td className={`py-2 pr-4 ${row.chain.ok ? classForUsd(row.mintUsd) : ""}`} title={row.chain.ok ? `${row.mintEth.toFixed(8)} ETH` : ""}>
                  {row.chain.ok ? `$${row.mintUsd.toFixed(4)}` : "N/A"}
                </td>
                <td className={`py-2 pr-4 ${row.chain.ok ? classForUsd(row.burnUsd) : ""}`} title={row.chain.ok ? `${row.burnEth.toFixed(8)} ETH` : ""}>
                  {row.chain.ok ? `$${row.burnUsd.toFixed(4)}` : "N/A"}
                </td>
                <td className={`py-2 pr-4 bg-blue-50 font-medium ${row.chain.ok ? classForUsd(row.customUsd) : ""}`} title={row.chain.ok ? `${row.customEth.toFixed(8)} ETH (${customGas.toLocaleString()} gas)` : ""}>
                  {row.chain.ok ? `$${row.customUsd.toFixed(4)}` : "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

