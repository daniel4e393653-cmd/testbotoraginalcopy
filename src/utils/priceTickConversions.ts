import { tickIndexToSqrtPriceX64 } from "./clmmMath";
import { Coin } from "./Coin";
import { Fraction } from "./Fraction";
import { BigintIsh, Q128 } from "../constants";
import { BN } from "bn.js";

export function tickToPrice(
  baseCoin: Coin,
  quoteCoin: Coin,
  tick: number
): Fraction {
  const sqrtRatioX64 = tickIndexToSqrtPriceX64(tick);
  return sqrtPriceX64ToPrice(baseCoin, quoteCoin, sqrtRatioX64);
}

export function sqrtPriceX64ToPrice(
  baseCoin: Coin,
  quoteCoin: Coin,
  sqrtPriceX64: BigintIsh
): Fraction {
  const ratioX128 = new BN(sqrtPriceX64).mul(new BN(sqrtPriceX64));
  return baseCoin.sortsBefore(quoteCoin)
    ? new Fraction(ratioX128, Q128)
    : new Fraction(Q128, ratioX128);
}
