import BN from "bn.js";

function gcd(a: BN, b: BN): BN {
  a = a.abs();
  b = b.abs();
  while (!b.isZero()) {
    const t = b;
    b = a.mod(b);
    a = t;
  }
  return a;
}

function toBN(value: BN | string | number): BN {
  if (BN.isBN(value)) return value;
  return new BN(value);
}

export class Fraction {
  public readonly numerator: BN;
  public readonly denominator: BN;

  constructor(
    numerator: BN | string | number,
    denominator: BN | string | number = 1
  ) {
    const num = toBN(numerator);
    const den = toBN(denominator);

    if (den.isZero()) {
      throw new Error("Division by zero");
    }

    // Normalize sign: denominator is always positive
    if (den.isNeg()) {
      this.numerator = num.neg();
      this.denominator = den.neg();
    } else {
      this.numerator = num;
      this.denominator = den;
    }
  }

  private reduce(): Fraction {
    const g = gcd(this.numerator, this.denominator);
    if (g.eq(new BN(1))) return this;
    return new Fraction(this.numerator.div(g), this.denominator.div(g));
  }

  private toFraction(other: Fraction | BN | string | number): Fraction {
    if (other instanceof Fraction) return other;
    return new Fraction(toBN(other));
  }

  get quotient(): BN {
    return this.numerator.div(this.denominator);
  }

  get remainder(): BN {
    return this.numerator.mod(this.denominator);
  }

  get asFraction(): Fraction {
    return this;
  }

  invert(): Fraction {
    if (this.numerator.isZero()) {
      throw new Error("Cannot invert zero");
    }
    return new Fraction(this.denominator, this.numerator);
  }

  add(other: Fraction | BN | string | number): Fraction {
    const o = this.toFraction(other);
    // a/b + c/d = (a*d + c*b) / (b*d)
    const num = this.numerator.mul(o.denominator).add(o.numerator.mul(this.denominator));
    const den = this.denominator.mul(o.denominator);
    return new Fraction(num, den).reduce();
  }

  subtract(other: Fraction | BN | string | number): Fraction {
    const o = this.toFraction(other);
    const num = this.numerator.mul(o.denominator).sub(o.numerator.mul(this.denominator));
    const den = this.denominator.mul(o.denominator);
    return new Fraction(num, den).reduce();
  }

  multiply(other: Fraction | BN | string | number): Fraction {
    const o = this.toFraction(other);
    const num = this.numerator.mul(o.numerator);
    const den = this.denominator.mul(o.denominator);
    return new Fraction(num, den).reduce();
  }

  divide(other: Fraction | BN | string | number): Fraction {
    const o = this.toFraction(other);
    return this.multiply(o.invert());
  }

  lt(other: Fraction): boolean {
    // a/b < c/d  ⟺  a*d < c*b (when denominators are positive)
    return this.numerator.mul(other.denominator).lt(other.numerator.mul(this.denominator));
  }

  eq(other: Fraction): boolean {
    return this.numerator.mul(other.denominator).eq(other.numerator.mul(this.denominator));
  }

  gt(other: Fraction): boolean {
    return this.numerator.mul(other.denominator).gt(other.numerator.mul(this.denominator));
  }

  toFixed(
    decimals: number,
    options?: { decimalSeparator?: string; groupSeparator?: string }
  ): string {
    const decSep = options?.decimalSeparator ?? ".";
    const groupSep = options?.groupSeparator ?? "";

    const isNeg = this.numerator.isNeg();
    const absNum = this.numerator.abs();

    const quotient = absNum.div(this.denominator);
    const remainder = absNum.mod(this.denominator);

    let intPart = quotient.toString(10);

    // Apply group separator to integer part
    if (groupSep) {
      intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, groupSep);
    }

    let result: string;
    if (decimals === 0) {
      result = intPart;
    } else {
      // Compute fractional digits: remainder * 10^decimals / denominator
      const scale = new BN(10).pow(new BN(decimals));
      const fracValue = remainder.mul(scale).div(this.denominator);
      const fracStr = fracValue.toString(10).padStart(decimals, "0");
      result = intPart + decSep + fracStr;
    }

    return isNeg ? "-" + result : result;
  }
}
