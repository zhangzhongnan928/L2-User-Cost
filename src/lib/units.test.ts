import { describe, it, expect } from "vitest";
import { calcFeeEth, calcFeeUsd } from "./units";

describe("units", () => {
  it("calculates fee in ETH from wei gasPrice", () => {
    // gasPrice: 2 gwei = 2e-9 ETH per gas, gasUsed = 21_000
    const feeEth = calcFeeEth(21_000, (2n * 10n ** 9n).toString());
    // 21_000 * 2e-9 = 4.2e-5 ETH
    expect(feeEth).toBeCloseTo(4.2e-5, 12);
  });

  it("calculates fee in USD", () => {
    const feeUsd = calcFeeUsd(50_000, (1n * 10n ** 9n).toString(), 4000);
    // 50k * 1e-9 ETH * 4000 = 0.2 USD
    expect(feeUsd).toBeCloseTo(0.2, 8);
  });
});

