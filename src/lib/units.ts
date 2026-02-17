import { formatUnits } from "ethers";

export function weiToEthDecimalString(wei: string): string {
  return formatUnits(wei, 18);
}

/** EVM: fee in native token units (ETH, RBNT, gUSDT, etc.) */
export function calcFeeNative(gasUsed: number, gasPriceWei: string): number {
  const gasPriceNative = Number(formatUnits(gasPriceWei, 18));
  return gasUsed * gasPriceNative;
}

/** EVM: fee in USD (native fee × nativeUsd) */
export function calcFeeUsd(gasUsed: number, gasPriceWei: string, nativeUsd: number): number {
  return calcFeeNative(gasUsed, gasPriceWei) * nativeUsd;
}

/**
 * Solana: fee in native SOL.
 * totalLamports = baseFee + CU × priorityPerCU / 1e6
 * fee in SOL = totalLamports / 1e9
 */
export function calcSolanaFeeNative(
  baseFeePerSigLamports: number,
  priorityMicroLamportsPerCu: number,
  cu: number,
): number {
  const totalLamports = baseFeePerSigLamports + (cu * priorityMicroLamportsPerCu) / 1e6;
  return totalLamports / 1e9;
}

/** Solana: fee in USD */
export function calcSolanaFeeUsd(
  baseFeePerSigLamports: number,
  priorityMicroLamportsPerCu: number,
  cu: number,
  solUsd: number,
): number {
  return calcSolanaFeeNative(baseFeePerSigLamports, priorityMicroLamportsPerCu, cu) * solUsd;
}

// Backward compat alias
export const calcFeeEth = calcFeeNative;
