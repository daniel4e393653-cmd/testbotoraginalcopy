import BN from "bn.js";

import {
  tickIndexToSqrtPriceX64,
  Q64,
  maxLiquidityForAmountX,
  maxLiquidityForAmountY,
  getAmountsForLiquidity,
} from "../../utils/clmmMath";
import { Pool, PoolCoin } from "../pool/Pool";

interface RewardInfo {
  coinsOwedReward: string;
  rewardGrowthInsideLast: string;
}

interface PositionParams {
  objectId: string;
  liquidity: string | BN;
  owner: string;
  pool: Pool;
  tickLower: number;
  tickUpper: number;
  feeGrowthInsideXLast: string;
  feeGrowthInsideYLast: string;
  coinsOwedX: string;
  coinsOwedY: string;
  rewardInfos: RewardInfo[];
}

export class Position {
  public readonly id: string;
  public readonly liquidity: BN;
  public readonly owner: string;
  public readonly pool: Pool;
  public readonly tickLower: number;
  public readonly tickUpper: number;

  private readonly _feeGrowthInsideXLast: string;
  private readonly _feeGrowthInsideYLast: string;
  private readonly _coinsOwedX: string;
  private readonly _coinsOwedY: string;
  private readonly _rewardInfos: RewardInfo[];

  constructor(params: PositionParams) {
    this.id = params.objectId;
    this.liquidity = BN.isBN(params.liquidity)
      ? params.liquidity
      : new BN(params.liquidity);
    this.owner = params.owner;
    this.pool = params.pool;
    this.tickLower = params.tickLower;
    this.tickUpper = params.tickUpper;
    this._feeGrowthInsideXLast = params.feeGrowthInsideXLast;
    this._feeGrowthInsideYLast = params.feeGrowthInsideYLast;
    this._coinsOwedX = params.coinsOwedX;
    this._coinsOwedY = params.coinsOwedY;
    this._rewardInfos = params.rewardInfos;
  }

  get amountX(): { coin: PoolCoin } {
    return { coin: this.pool.coinX };
  }

  get amountY(): { coin: PoolCoin } {
    return { coin: this.pool.coinY };
  }

  get mintAmounts(): { amountX: BN; amountY: BN } {
    const sqrtPriceCurrent = new BN(this.pool.sqrtPriceX64.toString());
    const sqrtPriceLower = tickIndexToSqrtPriceX64(this.tickLower);
    const sqrtPriceUpper = tickIndexToSqrtPriceX64(this.tickUpper);

    return getAmountsForLiquidity(
      sqrtPriceCurrent,
      sqrtPriceLower,
      sqrtPriceUpper,
      this.liquidity,
      true,
    );
  }

  async getFees(): Promise<{ amountX: BN; amountY: BN }> {
    return {
      amountX: new BN(this._coinsOwedX),
      amountY: new BN(this._coinsOwedY),
    };
  }

  async getRewards(): Promise<BN[]> {
    return this._rewardInfos.map((r) => new BN(r.coinsOwedReward));
  }

  static fromAmounts({
    owner,
    pool,
    tickLower,
    tickUpper,
    amountX,
    amountY,
    useFullPrecision,
  }: {
    owner: string;
    pool: Pool;
    tickLower: number;
    tickUpper: number;
    amountX: BN;
    amountY: BN;
    useFullPrecision: boolean;
  }): Position {
    const sqrtPriceCurrent = new BN(pool.sqrtPriceX64.toString());
    const sqrtPriceLower = tickIndexToSqrtPriceX64(tickLower);
    const sqrtPriceUpper = tickIndexToSqrtPriceX64(tickUpper);

    let liquidity: BN;
    if (sqrtPriceCurrent.lt(sqrtPriceLower)) {
      // All token X
      liquidity = maxLiquidityForAmountX(sqrtPriceLower, sqrtPriceUpper, amountX);
    } else if (sqrtPriceCurrent.gte(sqrtPriceUpper)) {
      // All token Y
      liquidity = maxLiquidityForAmountY(sqrtPriceLower, sqrtPriceUpper, amountY);
    } else {
      // In range — use the smaller liquidity of the two
      const liqX = maxLiquidityForAmountX(sqrtPriceCurrent, sqrtPriceUpper, amountX);
      const liqY = maxLiquidityForAmountY(sqrtPriceLower, sqrtPriceCurrent, amountY);
      liquidity = BN.min(liqX, liqY);
    }

    return new Position({
      objectId: "",
      liquidity,
      owner,
      pool,
      tickLower,
      tickUpper,
      feeGrowthInsideXLast: "0",
      feeGrowthInsideYLast: "0",
      coinsOwedX: "0",
      coinsOwedY: "0",
      rewardInfos: [],
    });
  }
}
