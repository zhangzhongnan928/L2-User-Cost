"use client";

import { useEffect, useState } from "react";

type Props = {
  value: { intervalMs: number; erc20TransferGas: number };
  onChange: (v: { intervalMs: number; erc20TransferGas: number }) => void;
};

export function Settings({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [intervalMs, setIntervalMs] = useState(value.intervalMs);
  const [erc20TransferGas, setErc20TransferGas] = useState(value.erc20TransferGas);

  useEffect(() => {
    setIntervalMs(value.intervalMs);
    setErc20TransferGas(value.erc20TransferGas);
  }, [value.intervalMs, value.erc20TransferGas]);

  return (
    <div>
      <button
        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        onClick={() => setOpen(true)}
      >
        Advanced settings
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg w-[520px] p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">Advanced settings</h2>
              <button className="text-sm text-gray-500" onClick={() => setOpen(false)}>Close</button>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between gap-4">
                <span>Auto refresh interval</span>
                <select
                  className="border rounded px-2 py-1"
                  value={intervalMs}
                  onChange={(e) => setIntervalMs(Number(e.target.value))}
                >
                  <option value={5_000}>5s</option>
                  <option value={10_000}>10s</option>
                  <option value={30_000}>30s</option>
                  <option value={60_000}>60s</option>
                </select>
              </label>

              <label className="flex items-center justify-between gap-4">
                <span>ERC20 transfer gasUsed</span>
                <input
                  type="number"
                  className="w-36 border rounded px-2 py-1"
                  value={erc20TransferGas}
                  onChange={(e) => setErc20TransferGas(Number(e.target.value) || 50_000)}
                  min={10_000}
                  step={500}
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="px-3 py-1 rounded bg-gray-100" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  onChange({ intervalMs, erc20TransferGas });
                  setOpen(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

