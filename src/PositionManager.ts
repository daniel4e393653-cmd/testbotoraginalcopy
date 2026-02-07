import BN from "bn.js";
import invariant from "tiny-invariant";
import { Transaction, TransactionResult } from "@mysten/sui/transactions";

import { Percent } from "./utils/Percent";
import { Coin } from "./utils/Coin";
import { BPS } from "./constants";
import {
  Pool,
  Position,
  createPositionManager,
} from "./entities";
import { getLogger } from "./utils/Logger";

const logger = getLogger(module);

interface RebalancerConstructorArgs {
  slippageTolerance: Percent;
  priceImpactPercentThreshold?: Percent;
  minZapAmounts: { amountX: BN; amountY: BN };
  rewardThresholdUsd?: BN;
  trackingVolumeAddress?: string;
}

export class PositionManager {
  private slippageTolerance: Percent;
  private minZapAmounts: { amountX: BN; amountY: BN };

  constructor({
    slippageTolerance,
    minZapAmounts,
  }: RebalancerConstructorArgs) {
    this.slippageTolerance = slippageTolerance;
    this.minZapAmounts = minZapAmounts;
    invariant(
      this.slippageTolerance.numerator.gte(new BN(0)) &&
        this.slippageTolerance.numerator.lte(new BN(BPS)),
      "slippageTolerance must be between 0 and 1"
    );
  }

  migrate =
    (position: Position, tickLower: number, tickUpper: number) =>
    async (tx: Transaction) => {
      const positionManager = createPositionManager(
        (position.pool as Pool).protocol
      );

      const [feeAmounts, rewardAmounts] = await Promise.all([
        position.getFees(),
        position.getRewards(),
      ]);

      const [removedX, removedY] = positionManager.decreaseLiquidity(position, {
        slippageTolerance: this.slippageTolerance,
        deadline: Number.MAX_SAFE_INTEGER,
      })(tx);

      const nonPoolTokenRewards: {
        coin: Coin;
        object: TransactionResult;
      }[] = [];
      const coinX = position.pool.coinX;
      const coinY = position.pool.coinY;

      position.pool.poolRewards.forEach((rewardInfo, idx) => {
        if (rewardAmounts[idx].gt(new BN(0))) {
          const collectedReward = positionManager.collectReward(position, {
            rewardCoin: rewardInfo.coin,
          })(tx);

          if (rewardInfo.coin.coinType === coinX.coinType) {
            tx.mergeCoins(removedX, [collectedReward]);
          } else if (rewardInfo.coin.coinType === coinY.coinType) {
            tx.mergeCoins(removedY, [collectedReward]);
          } else {
            nonPoolTokenRewards.push({
              coin: rewardInfo.coin,
              object: collectedReward,
            });
          }
        }
      });

      positionManager.closePosition(position)(tx);

      const positionThatWillBeCreated = Position.fromAmounts({
        owner: position.owner,
        pool: position.pool,
        tickLower,
        tickUpper,
        amountX: position.mintAmounts.amountX.add(feeAmounts.amountX),
        amountY: position.mintAmounts.amountY.add(feeAmounts.amountY),
        useFullPrecision: false,
      });

      const newPositionObj = positionManager.increaseLiquidity(
        positionThatWillBeCreated,
        {
          coinXIn: removedX,
          coinYIn: removedY,
          slippageTolerance: this.slippageTolerance,
          deadline: Number.MAX_SAFE_INTEGER,
          createPosition: true,
        }
      )(tx) as TransactionResult;

      tx.transferObjects([newPositionObj], position.owner);

      if (nonPoolTokenRewards.length > 0) {
        nonPoolTokenRewards.forEach((reward) => {
          tx.transferObjects([reward.object], position.owner);
        });
      }
    };

  compound = (position: Position) => async (tx: Transaction) => {
    const positionManager = createPositionManager(
      (position.pool as Pool).protocol
    );
    const coinX = position.pool.coinX;
    const coinY = position.pool.coinY;
    const [feeAmounts, rewardAmounts] = await Promise.all([
      position.getFees(),
      position.getRewards(),
    ]);

    const [collectedX, collectedY] = positionManager.collect(position, {})(tx);

    const nonPoolTokenRewards: {
      coin: Coin;
      object: TransactionResult;
    }[] = [];
    position.pool.poolRewards.forEach((rewardInfo, idx) => {
      if (rewardAmounts[idx].gt(new BN(0))) {
        const collectedReward = positionManager.collectReward(position, {
          rewardCoin: rewardInfo.coin,
        })(tx);

        if (rewardInfo.coin.coinType === coinX.coinType) {
          tx.mergeCoins(collectedX, [collectedReward]);
        } else if (rewardInfo.coin.coinType === coinY.coinType) {
          tx.mergeCoins(collectedY, [collectedReward]);
        } else {
          nonPoolTokenRewards.push({
            coin: rewardInfo.coin,
            object: collectedReward,
          });
        }
      }
    });

    const expectedMintAmounts = {
      amountX: feeAmounts.amountX,
      amountY: feeAmounts.amountY,
    };

    const positionThatWillBeIncreased = Position.fromAmounts({
      owner: position.owner,
      pool: position.pool,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      amountX: expectedMintAmounts.amountX,
      amountY: expectedMintAmounts.amountY,
      useFullPrecision: false,
    });
    (positionThatWillBeIncreased as any)["id"] = position.id;

    positionManager.increaseLiquidity(positionThatWillBeIncreased, {
      coinXIn: collectedX,
      coinYIn: collectedY,
      slippageTolerance: this.slippageTolerance,
      deadline: Number.MAX_SAFE_INTEGER,
    })(tx);

    if (nonPoolTokenRewards.length > 0) {
      nonPoolTokenRewards.forEach((reward) => {
        tx.transferObjects([reward.object], position.owner);
      });
    }

    logger.info(
      `Compound position, position_id=${position.id}`
    );
  };
}
