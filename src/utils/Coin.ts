import { normalizeSuiObjectId } from "@mysten/sui/utils";

function normalizeCoinType(coinType: string): string {
  const idx = coinType.indexOf("::");
  if (idx === -1) {
    return normalizeSuiObjectId(coinType);
  }
  const address = coinType.slice(0, idx);
  const rest = coinType.slice(idx);
  return normalizeSuiObjectId(address) + rest;
}

export class Coin {
  public readonly coinType: string;
  public readonly decimals: number;
  public readonly symbol: string;
  public readonly name: string;

  constructor(
    coinType: string,
    decimals: number = 0,
    symbol: string = "",
    name: string = ""
  ) {
    this.coinType = normalizeCoinType(coinType);
    this.decimals = decimals;
    this.symbol = symbol;
    this.name = name;
  }

  equals(other: Coin): boolean {
    return this.coinType === other.coinType;
  }

  sortsBefore(other: Coin): boolean {
    return this.coinType < other.coinType;
  }
}
