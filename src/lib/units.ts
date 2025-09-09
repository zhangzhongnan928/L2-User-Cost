import { formatUnits } from "ethers";

export function weiToEthDecimalString(wei: string): string {
  return formatUnits(wei, 18);
}

export function calcFeeEth(gasUsed: number, gasPriceWei: string): number {
  const gasPriceEth = Number(formatUnits(gasPriceWei, 18));
  return gasUsed * gasPriceEth;
}

export function calcFeeUsd(gasUsed: number, gasPriceWei: string, ethUsd: number): number {
  return calcFeeEth(gasUsed, gasPriceWei) * ethUsd;
}

