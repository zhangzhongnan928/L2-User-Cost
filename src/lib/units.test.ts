import { describe, it, expect } from "vitest";
import { calcFeeEth, calcFeeNative, calcFeeUsd, calcSolanaFeeNative, calcSolanaFeeUsd } from "./units";

describe("units – EVM", () => {
  it("calculates fee in native token from wei gasPrice", () => {
    // gasPrice: 2 gwei = 2e-9 ETH per gas, gasUsed = 21_000
    const feeNative = calcFeeNative(21_000, (2n * 10n ** 9n).toString());
    // 21_000 * 2e-9 = 4.2e-5 ETH
    expect(feeNative).toBeCloseTo(4.2e-5, 12);
  });

  it("backward compat alias calcFeeEth works", () => {
    const feeEth = calcFeeEth(21_000, (2n * 10n ** 9n).toString());
    expect(feeEth).toBeCloseTo(4.2e-5, 12);
  });

  it("calculates fee in USD", () => {
    const feeUsd = calcFeeUsd(50_000, (1n * 10n ** 9n).toString(), 4000);
    // 50k * 1e-9 ETH * 4000 = 0.2 USD
    expect(feeUsd).toBeCloseTo(0.2, 8);
  });
});

describe("units – Solana", () => {
  it("calculates Solana fee in SOL (base fee only, no priority)", () => {
    // base fee = 5000 lamports, priority = 0, CU = 300
    const fee = calcSolanaFeeNative(5000, 0, 300);
    // 5000 / 1e9 = 0.000005 SOL
    expect(fee).toBeCloseTo(0.000005, 12);
  });

  it("calculates Solana fee in SOL (with priority fee)", () => {
    // base = 5000 lamports, priority = 1000 micro-lamports/CU, CU = 5000
    // priority lamports = 5000 * 1000 / 1e6 = 5 lamports
    // total = 5000 + 5 = 5005 lamports = 0.000005005 SOL
    const fee = calcSolanaFeeNative(5000, 1000, 5000);
    expect(fee).toBeCloseTo(0.000005005, 12);
  });

  it("calculates Solana fee in USD", () => {
    // base = 5000 lamports, priority = 0, CU = 300, SOL/USD = 150
    // 5000 / 1e9 * 150 = 0.00075 USD
    const feeUsd = calcSolanaFeeUsd(5000, 0, 300, 150);
    expect(feeUsd).toBeCloseTo(0.00075, 8);
  });

  it("calculates Solana fee in USD with priority", () => {
    // base = 5000 lamports, priority = 2000 micro-lamports/CU, CU = 5000, SOL/USD = 200
    // priority lamports = 5000 * 2000 / 1e6 = 10
    // total = 5010 lamports = 5.01e-6 SOL
    // USD = 5.01e-6 * 200 = 0.001002
    const feeUsd = calcSolanaFeeUsd(5000, 2000, 5000, 200);
    expect(feeUsd).toBeCloseTo(0.001002, 8);
  });
});
