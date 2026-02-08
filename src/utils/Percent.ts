import BN from "bn.js";
import { Fraction } from "./Fraction";

export class Percent extends Fraction {
  constructor(
    numerator: BN | string | number,
    denominator: BN | string | number = 1
  ) {
    super(numerator, denominator);
  }

  // add/subtract skip reduce() to preserve exact numerator/denominator
  add(other: Percent): Percent {
    const num = this.numerator
      .mul(other.denominator)
      .add(other.numerator.mul(this.denominator));
    const den = this.denominator.mul(other.denominator);
    return new Percent(num, den);
  }

  subtract(other: Percent): Percent {
    const num = this.numerator
      .mul(other.denominator)
      .sub(other.numerator.mul(this.denominator));
    const den = this.denominator.mul(other.denominator);
    return new Percent(num, den);
  }

  multiply(other: BN | string | number | Fraction): Fraction {
    return super.multiply(other);
  }

  get asFraction(): Fraction {
    return new Fraction(this.numerator, this.denominator);
  }

  toFixed(
    decimals: number,
    options?: { decimalSeparator?: string; groupSeparator?: string }
  ): string {
    // Display as percentage: multiply the value by 100
    return new Fraction(
      this.numerator.mul(new BN(100)),
      this.denominator
    ).toFixed(decimals, options);
  }
}
