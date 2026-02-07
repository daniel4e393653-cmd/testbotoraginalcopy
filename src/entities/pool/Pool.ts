import BN from "bn.js";
import { normalizeSuiObjectId } from "@mysten/sui/utils";

import { Fraction } from "../../utils/Fraction";
import { tickIndexToSqrtPriceX64, Q64 } from "../../utils/clmmMath";
import { BigintIsh, ClmmProtocol } from "../../constants";

export interface PoolCoin {
  readonly coinType: string;
  readonly decimals: number;
}

export class Pool {
  public readonly id: string;
  public readonly coins: PoolCoin[];
  public readonly poolRewards: any[];
  public readonly reserves: BigintIsh[];
  public readonly fee: number;
  public readonly sqrtPriceX64: BigintIsh;
  public readonly tickCurrent: number;
  public readonly liquidity: BigintIsh;
  public readonly feeGrowthGlobalX: BigintIsh;
  public readonly feeGrowthGlobalY: BigintIsh;
  public readonly tickDataProvider: any;
  public readonly tickSpacing: number;
  public readonly protocol: ClmmProtocol;

  constructor({
    objectId,
    coins,
    poolRewards,
    reserves,
    fee,
    sqrtPriceX64,
    tickCurrent,
    liquidity,
    protocol,
    feeGrowthGlobalX,
    feeGrowthGlobalY,
    tickDataProvider,
    tickSpacing,
  }: {
    objectId: string;
    coins: PoolCoin[];
    poolRewards: any[];
    reserves: BigintIsh[];
    fee: number;
    sqrtPriceX64: BigintIsh;
    tickCurrent: number;
    liquidity: BigintIsh;
    protocol: ClmmProtocol;
    feeGrowthGlobalX: BigintIsh;
    feeGrowthGlobalY: BigintIsh;
    tickDataProvider?: any;
    tickSpacing?: number;
  }) {
    this.id = normalizeSuiObjectId(objectId);
    this.coins = coins;
    this.poolRewards = poolRewards;
    this.reserves = reserves;
    this.fee = fee;
    this.sqrtPriceX64 = sqrtPriceX64;
    this.tickCurrent = tickCurrent;
    this.liquidity = liquidity;
    this.protocol = protocol;
    this.feeGrowthGlobalX = feeGrowthGlobalX;
    this.feeGrowthGlobalY = feeGrowthGlobalY;
    this.tickDataProvider = tickDataProvider ?? null;
    this.tickSpacing = tickSpacing ?? Math.floor(fee / 50);
  }

  get coinX(): PoolCoin {
    return this.coins[0];
  }

  get coinY(): PoolCoin {
    return this.coins[1];
  }

  getRatio(tickLower: number, tickUpper: number): Fraction {
    const sqrtPriceLowerX64 = tickIndexToSqrtPriceX64(tickLower);
    const sqrtPriceUpperX64 = tickIndexToSqrtPriceX64(tickUpper);
    const sqrtPriceCurrentX64 = new BN(this.sqrtPriceX64.toString());

    if (sqrtPriceCurrentX64.lte(sqrtPriceLowerX64)) {
      // Position is entirely token X; return a large ratio
      return new Fraction(Q64.mul(Q64), new BN(1));
    }

    if (sqrtPriceCurrentX64.gte(sqrtPriceUpperX64)) {
      // Position is entirely token Y; return a near-zero ratio
      return new Fraction(new BN(1), Q64.mul(Q64));
    }

    // ratio = (sqrtPriceUpper - sqrtPriceCurrent) * Q64^2
    //       / [sqrtPriceCurrent * sqrtPriceUpper * (sqrtPriceCurrent - sqrtPriceLower)]
    const numerator = sqrtPriceUpperX64
      .sub(sqrtPriceCurrentX64)
      .mul(Q64)
      .mul(Q64);
    const denominator = sqrtPriceCurrentX64
      .mul(sqrtPriceUpperX64)
      .mul(sqrtPriceCurrentX64.sub(sqrtPriceLowerX64));

    return new Fraction(numerator, denominator);
  }
}
