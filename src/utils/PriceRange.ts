import BN from "bn.js";
import { tickIndexToSqrtPriceX64 } from "./clmmMath";
import { Percent } from "./Percent";

export class PriceRange {
  priceLower: BN;
  priceUpper: BN;
  bPriceLower: BN;
  bPriceUpper: BN;
  tPriceLower: BN;
  tPriceUpper: BN;
  valid: boolean;

  constructor(
    tickLower: number,
    tickUpper: number,
    bPricePercent: Percent,
    tPricePercent: Percent
  ) {
    this.valid = true;

    this.priceLower = tickIndexToSqrtPriceX64(tickLower);
    this.priceUpper = tickIndexToSqrtPriceX64(tickUpper);

    // Safety: wrong tick order
    if (this.priceUpper.lte(this.priceLower)) {
      const tmp = this.priceLower;
      this.priceLower = this.priceUpper;
      this.priceUpper = tmp;
    }

    const priceDiff = this.priceUpper.sub(this.priceLower);

    // ---- Base range ----
    const bPriceDiff = bPricePercent.multiply(priceDiff).quotient;
    this.bPriceLower = this.priceLower.add(bPriceDiff);
    this.bPriceUpper = this.priceUpper.sub(bPriceDiff);

    if (this.bPriceUpper.lte(this.bPriceLower)) {
      this.valid = false;
      return;
    }

    // ---- Target range ----
    const tPriceDiff = tPricePercent.multiply(priceDiff).quotient;
    this.tPriceLower = this.priceLower.add(tPriceDiff);
    this.tPriceUpper = this.priceUpper.sub(tPriceDiff);

    if (this.tPriceUpper.lte(this.tPriceLower)) {
      this.valid = false;
      return;
    }

    if (this.tPriceUpper.gte(this.bPriceUpper)) {
      this.valid = false;
      return;
    }
  }
}
