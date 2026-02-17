"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import { calcFeeUsd, calcFeeNative, calcSolanaFeeUsd, calcSolanaFeeNative } from "@/lib/units";
import { Settings } from "@/components/Settings";

type SolanaFeeData = {
  baseFeePerSigLamports: number;
  medianPriorityMicroLamportsPerCu: number;
  estimatedCu: {
    transfer: number;
    tokenTransfer: number;
    tokenMint: number;
    tokenBurn: number;
  };
};

type ApiChain = {
  name: string;
  chainId: number;
  gasPriceWei: string;
  ok: boolean;
  errors: string[];
  nativeCurrency: string;
  usdStablecoin?: boolean;
  testnet?: boolean;
  chainType: "evm" | "solana";
  coingeckoId?: string;
  solanaFees?: SolanaFeeData;
};

type ApiResponse = {
  prices: Record<string, number>;
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

type RowData = {
  chain: ApiChain;
  nativeUsd: number;
  transferUsd: number;
  tokenTransferUsd: number;
  tokenMintUsd: number;
  tokenBurnUsd: number;
  customUsd: number;
  transferNative: number;
  tokenTransferNative: number;
  tokenMintNative: number;
  tokenBurnNative: number;
  customNative: number;
};

export function CostTable() {
  const [intervalMs, setIntervalMs] = useState(10_000);
  const [erc20TransferGas, setErc20TransferGas] = useState(DEFAULTS.erc20Transfer);
  const [customGas, setCustomGas] = useState(DEFAULTS.customGas);
  type SortKey = "name" | "nativeUsd" | "transferUsd" | "tokenTransferUsd" | "mintUsd" | "burnUsd" | "customUsd";
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

  const rows = useMemo((): RowData[] => {
    if (!data?.chains) return [];
    const prices = data.prices || {};

    return data.chains.map((c): RowData => {
      if (!c.ok) {
        return {
          chain: c, nativeUsd: NaN,
          transferUsd: NaN, tokenTransferUsd: NaN, tokenMintUsd: NaN, tokenBurnUsd: NaN, customUsd: NaN,
          transferNative: NaN, tokenTransferNative: NaN, tokenMintNative: NaN, tokenBurnNative: NaN, customNative: NaN,
        };
      }

      const nativeUsd = c.usdStablecoin ? 1 : (prices[c.coingeckoId || ""] || 0);
      const hasPrice = nativeUsd > 0;

      if (c.chainType === "solana" && c.solanaFees) {
        const sf = c.solanaFees;
        const base = sf.baseFeePerSigLamports;
        const prio = sf.medianPriorityMicroLamportsPerCu;
        return {
          chain: c,
          nativeUsd,
          transferUsd: hasPrice ? calcSolanaFeeUsd(base, prio, sf.estimatedCu.transfer, nativeUsd) : NaN,
          tokenTransferUsd: hasPrice ? calcSolanaFeeUsd(base, prio, sf.estimatedCu.tokenTransfer, nativeUsd) : NaN,
          tokenMintUsd: hasPrice ? calcSolanaFeeUsd(base, prio, sf.estimatedCu.tokenMint, nativeUsd) : NaN,
          tokenBurnUsd: hasPrice ? calcSolanaFeeUsd(base, prio, sf.estimatedCu.tokenBurn, nativeUsd) : NaN,
          customUsd: hasPrice ? calcSolanaFeeUsd(base, prio, customGas, nativeUsd) : NaN,
          transferNative: calcSolanaFeeNative(base, prio, sf.estimatedCu.transfer),
          tokenTransferNative: calcSolanaFeeNative(base, prio, sf.estimatedCu.tokenTransfer),
          tokenMintNative: calcSolanaFeeNative(base, prio, sf.estimatedCu.tokenMint),
          tokenBurnNative: calcSolanaFeeNative(base, prio, sf.estimatedCu.tokenBurn),
          customNative: calcSolanaFeeNative(base, prio, customGas),
        };
      }

      // EVM chain
      return {
        chain: c,
        nativeUsd,
        transferUsd: hasPrice ? calcFeeUsd(DEFAULTS.ethTransfer, c.gasPriceWei, nativeUsd) : NaN,
        tokenTransferUsd: hasPrice ? calcFeeUsd(erc20TransferGas, c.gasPriceWei, nativeUsd) : NaN,
        tokenMintUsd: hasPrice ? calcFeeUsd(DEFAULTS.erc20Mint, c.gasPriceWei, nativeUsd) : NaN,
        tokenBurnUsd: hasPrice ? calcFeeUsd(DEFAULTS.erc20Burn, c.gasPriceWei, nativeUsd) : NaN,
        customUsd: hasPrice ? calcFeeUsd(customGas, c.gasPriceWei, nativeUsd) : NaN,
        transferNative: calcFeeNative(DEFAULTS.ethTransfer, c.gasPriceWei),
        tokenTransferNative: calcFeeNative(erc20TransferGas, c.gasPriceWei),
        tokenMintNative: calcFeeNative(DEFAULTS.erc20Mint, c.gasPriceWei),
        tokenBurnNative: calcFeeNative(DEFAULTS.erc20Burn, c.gasPriceWei),
        customNative: calcFeeNative(customGas, c.gasPriceWei),
      };
    });
  }, [data?.chains, data?.prices, erc20TransferGas, customGas]);

  function getRowValue(row: RowData): number | string {
    switch (sortKey) {
      case "name": return row.chain.name.toLowerCase();
      case "nativeUsd": return row.nativeUsd;
      case "transferUsd": return row.transferUsd;
      case "tokenTransferUsd": return row.tokenTransferUsd;
      case "mintUsd": return row.tokenMintUsd;
      case "burnUsd": return row.tokenBurnUsd;
      case "customUsd": return row.customUsd;
    }
  }

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = getRowValue(a);
      const bv = getRowValue(b);
      if (typeof av === "string" && typeof bv === "string") {
        const cmp = av.localeCompare(bv);
        return sortDir === "asc" ? cmp : -cmp;
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sortKey, sortDir]);

  function header(label: string, key: SortKey) {
    const active = sortKey === key;
    const arrow = active ? (sortDir === "asc" ? "▲" : "▼") : "";
    return (
      <button
        className="inline-flex items-center gap-1 select-none cursor-pointer"
        onClick={() => {
          if (active) setSortDir(sortDir === "asc" ? "desc" : "asc");
          else { setSortKey(key); setSortDir("asc"); }
        }}
        type="button"
      >
        <span>{label}</span>
        <span className="text-gray-500 text-[11px]">{arrow}</span>
      </button>
    );
  }

  function chainLabel(c: ApiChain) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {c.name}
        {c.testnet && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium leading-none">
            testnet
          </span>
        )}
      </span>
    );
  }

  function currencyLabel(c: ApiChain) {
    return (
      <span className="inline-flex items-center gap-1">
        {c.nativeCurrency}
        {c.usdStablecoin && <span className="text-xs text-blue-600">($)</span>}
      </span>
    );
  }

  function priceDisplay(row: RowData) {
    if (row.chain.usdStablecoin) return <span className="text-gray-400">N/A (stablecoin)</span>;
    if (row.chain.testnet) return <span className="text-gray-400">N/A (testnet)</span>;
    if (!row.nativeUsd || !isFinite(row.nativeUsd)) return <span className="text-gray-400">N/A</span>;
    return `$${row.nativeUsd.toFixed(4)}`;
  }

  function nativeTooltip(nativeValue: number, currency: string) {
    if (!isFinite(nativeValue)) return "";
    return `${nativeValue.toFixed(8)} ${currency}`;
  }

  function usdCell(usd: number, nativeVal: number, currency: string, ok: boolean, extraClass?: string) {
    const cls = `py-2 pr-4 ${extraClass || ""} ${ok && isFinite(usd) ? classForUsd(usd) : ""}`.trim();
    const title = ok ? nativeTooltip(nativeVal, currency) : "";
    return (
      <td className={cls} title={title}>
        {ok && isFinite(usd) ? `$${usd.toFixed(4)}` : "N/A"}
      </td>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 whitespace-nowrap">Custom Gas / CU:</span>
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
              <th className="py-2 pr-4">Currency</th>
              <th className="py-2 pr-4">{header("Native Currency Price/USD", "nativeUsd")}</th>
              <th className="py-2 pr-4">{header("Transfer (USD)", "transferUsd")}</th>
              <th className="py-2 pr-4">{header("Token Transfer (USD)", "tokenTransferUsd")}</th>
              <th className="py-2 pr-4">{header("Token Mint (USD)", "mintUsd")}</th>
              <th className="py-2 pr-4">{header("Token Burn (USD)", "burnUsd")}</th>
              <th className="py-2 pr-4 bg-blue-50">{header("Custom TX (USD)", "customUsd")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="py-3" colSpan={8}>Loading...</td>
              </tr>
            )}
            {sortedRows.map((row) => (
              <tr key={row.chain.chainId} className={`border-b ${row.chain.testnet ? "bg-gray-50/50" : ""}`}>
                <td className="py-2 pr-4">{chainLabel(row.chain)}</td>
                <td className="py-2 pr-4">{currencyLabel(row.chain)}</td>
                <td className="py-2 pr-4">{priceDisplay(row)}</td>
                {usdCell(row.transferUsd, row.transferNative, row.chain.nativeCurrency, row.chain.ok)}
                {usdCell(row.tokenTransferUsd, row.tokenTransferNative, row.chain.nativeCurrency, row.chain.ok)}
                {usdCell(row.tokenMintUsd, row.tokenMintNative, row.chain.nativeCurrency, row.chain.ok)}
                {usdCell(row.tokenBurnUsd, row.tokenBurnNative, row.chain.nativeCurrency, row.chain.ok)}
                {usdCell(row.customUsd, row.customNative, row.chain.nativeCurrency, row.chain.ok, "bg-blue-50 font-medium")}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
