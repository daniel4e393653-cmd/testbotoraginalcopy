import {
  coinWithBalance,
  Transaction,
  TransactionArgument,
  TransactionResult,
} from "@mysten/sui/transactions";
import {
  normalizeStructTag,
  SUI_CLOCK_OBJECT_ID,
  SUI_TYPE_ARG,
} from "@mysten/sui/utils";

import { BPS, MAX_U64 } from "../../constants";
import { Percent } from "../../utils/Percent";

import {
  IncreaseLiquidityOptions,
  DecreaseLiquidityOptions,
  CollectRewardsOptions,
  CollectOptions,
} from "../../types";
import { PositionManager } from "./PositionManager";
import { CETUS_CONFIG } from "../../constants";
import { Position } from "./Position";
import { getLogger } from "../../utils/Logger";

export class CetusPositionManager implements PositionManager {
  private readonly logger = getLogger(module);

  openPosition = (position: Position) => (tx: Transaction) => {
    const { packageId, globalConfigId } = CETUS_CONFIG;

    const tickLowerBits = position.tickLower >= 0 
      ? position.tickLower 
      : (1 << 32) + position.tickLower;
    
    const tickUpperBits = position.tickUpper >= 0 
      ? position.tickUpper 
      : (1 << 32) + position.tickUpper;

    return tx.moveCall({
      target: `${packageId}::pool::open_position`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
      ],
      arguments: [
        tx.object(globalConfigId),
        tx.object(position.pool.id),
        tx.pure.u32(tickLowerBits),
        tx.pure.u32(tickUpperBits),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  };

  closePosition = (position: Position) => (tx: Transaction) => {
    const { packageId, globalConfigId } = CETUS_CONFIG;
    tx.moveCall({
      target: `${packageId}::pool::close_position`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
      ],
      arguments: [
        tx.object(globalConfigId),
        tx.object(position.pool.id),
        tx.object(position.id),
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  };

  increaseLiquidity =
    (position: Position, options: IncreaseLiquidityOptions) =>
    (tx: Transaction) => {
      const { amountX: amountXDesired, amountY: amountYDesired } =
        position.mintAmounts;

      const minimumAmounts = {
        amountX: new Percent(1)
          .subtract(options.slippageTolerance)
          .multiply(amountXDesired)
          .asFraction.toFixed(0),
        amountY: new Percent(1)
          .subtract(options.slippageTolerance)
          .multiply(amountYDesired)
          .asFraction.toFixed(0),
      };
      const amountXMin = minimumAmounts.amountX.toString();
      const amountYMin = minimumAmounts.amountY.toString();

      let positionObject: TransactionResult | TransactionArgument;
      if (options.createPosition) {
        positionObject = this.openPosition(position)(tx);
      } else {
        positionObject = tx.object(position.id);
      }

      const [coinXIn, coinYIn] = [
        options.coinXIn ??
          coinWithBalance({
            type: position.amountX.coin.coinType,
            balance: BigInt(amountXDesired.toString()),
            useGasCoin:
              normalizeStructTag(SUI_TYPE_ARG) ===
              normalizeStructTag(position.amountX.coin.coinType),
          }),
        options.coinYIn ??
          coinWithBalance({
            type: position.amountY.coin.coinType,
            balance: BigInt(amountYDesired.toString()),
            useGasCoin:
              normalizeStructTag(SUI_TYPE_ARG) ===
              normalizeStructTag(position.amountY.coin.coinType),
          }),
      ];

      const { packageId, globalConfigId } = CETUS_CONFIG;
      tx.moveCall({
        target: `${packageId}::pool::add_liquidity`,
        typeArguments: [
          position.amountX.coin.coinType,
          position.amountY.coin.coinType,
        ],
        arguments: [
          tx.object(globalConfigId),
          tx.object(position.pool.id),
          positionObject,
          coinXIn,
          coinYIn,
          tx.pure.u64(amountXMin),
          tx.pure.u64(amountYMin),
          tx.pure.bool(true), // fix_amount_a
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });

      if (options.createPosition) {
        return positionObject as TransactionResult;
      }
    };

  decreaseLiquidity =
    (position: Position, options: DecreaseLiquidityOptions) =>
    (tx: Transaction) => {
      this.logger.debug(
        `Decreasing liquidity for position ${position.id} liquidity: ${position.liquidity.toString()}`
      );
      const { amountX: amountXDesired, amountY: amountYDesired } =
        position.mintAmounts;

      const minimumAmounts = {
        amountX: new Percent(1)
          .subtract(options.slippageTolerance)
          .multiply(amountXDesired)
          .asFraction.toFixed(0),
        amountY: new Percent(1)
          .subtract(options.slippageTolerance)
          .multiply(amountYDesired)
          .asFraction.toFixed(0),
      };

      const amountXMin = minimumAmounts.amountX.toString();
      const amountYMin = minimumAmounts.amountY.toString();

      const { packageId, globalConfigId } = CETUS_CONFIG;
      tx.moveCall({
        target: `${packageId}::pool::remove_liquidity`,
        typeArguments: [
          position.amountX.coin.coinType,
          position.amountY.coin.coinType,
        ],
        arguments: [
          tx.object(globalConfigId),
          tx.object(position.pool.id),
          tx.object(position.id),
          tx.pure.u128(position.liquidity.toString()),
          tx.pure.u64(amountXMin),
          tx.pure.u64(amountYMin),
          tx.pure.bool(true), // fix_amount_a - specifies which amount to fix during liquidity removal
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });

      const collectResult = tx.moveCall({
        target: `${packageId}::pool::collect_fee`,
        typeArguments: [
          position.amountX.coin.coinType,
          position.amountY.coin.coinType,
        ],
        arguments: [
          tx.object(globalConfigId),
          tx.object(position.pool.id),
          tx.object(position.id),
          tx.pure.bool(true), // collect all fees
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });

      return collectResult;
    };

  collect =
    (position: Position, options: CollectOptions) => (tx: Transaction) => {
      const { packageId, globalConfigId } = CETUS_CONFIG;

      const collectResult = tx.moveCall({
        target: `${packageId}::pool::collect_fee`,
        typeArguments: [
          position.amountX.coin.coinType,
          position.amountY.coin.coinType,
        ],
        arguments: [
          tx.object(globalConfigId),
          tx.object(position.pool.id),
          tx.object(position.id),
          tx.pure.bool(true), // collect all fees
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });

      return collectResult;
    };

  collectReward =
    (position: Position, options: CollectRewardsOptions) =>
    (tx: Transaction) => {
      const { packageId, globalConfigId } = CETUS_CONFIG;
      const collectedReward = tx.moveCall({
        target: `${packageId}::pool::collect_reward`,
        typeArguments: [
          position.amountX.coin.coinType,
          position.amountY.coin.coinType,
          options.rewardCoin.coinType,
        ],
        arguments: [
          tx.object(globalConfigId),
          tx.object(position.pool.id),
          tx.object(position.id),
          tx.pure.bool(true), // collect all rewards
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });

      return collectedReward;
    };
}
