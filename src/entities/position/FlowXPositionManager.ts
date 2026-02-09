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
import { FLOWX_V3_CONFIG } from "../../constants";
import { Position } from "./Position";
import { getLogger } from "../../utils/Logger";

export class FlowXPositionManager implements PositionManager {
  private readonly logger = getLogger(module);

  openPosition = (position: Position) => (tx: Transaction) => {
    const { packageId, versionObject } = FLOWX_V3_CONFIG;

    // Convert ticks to i32 format for FlowX
    const tickLowerI32 = this._tickToI32(position.tickLower);
    const tickUpperI32 = this._tickToI32(position.tickUpper);

    return tx.moveCall({
      target: `${packageId}::position_manager::open_position`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
      ],
      arguments: [
        tx.object(versionObject),
        tx.object(position.pool.id),
        tickLowerI32,
        tickUpperI32,
        tx.object(SUI_CLOCK_OBJECT_ID),
      ],
    });
  };

  closePosition = (position: Position) => (tx: Transaction) => {
    const { packageId, versionObject } = FLOWX_V3_CONFIG;
    tx.moveCall({
      target: `${packageId}::position_manager::close_position`,
      typeArguments: [
        position.amountX.coin.coinType,
        position.amountY.coin.coinType,
      ],
      arguments: [
        tx.object(versionObject),
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

      const { packageId, versionObject } = FLOWX_V3_CONFIG;
      tx.moveCall({
        target: `${packageId}::position_manager::add_liquidity`,
        typeArguments: [
          position.amountX.coin.coinType,
          position.amountY.coin.coinType,
        ],
        arguments: [
          tx.object(versionObject),
          tx.object(position.pool.id),
          positionObject,
          coinXIn,
          coinYIn,
          tx.pure.u64(amountXMin),
          tx.pure.u64(amountYMin),
          tx.pure.bool(true), // fix_amount_x
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

      const { packageId, versionObject } = FLOWX_V3_CONFIG;
      tx.moveCall({
        target: `${packageId}::position_manager::remove_liquidity`,
        typeArguments: [
          position.amountX.coin.coinType,
          position.amountY.coin.coinType,
        ],
        arguments: [
          tx.object(versionObject),
          tx.object(position.pool.id),
          tx.object(position.id),
          tx.pure.u128(position.liquidity.toString()),
          tx.pure.u64(amountXMin),
          tx.pure.u64(amountYMin),
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });

      const collectResult = tx.moveCall({
        target: `${packageId}::position_manager::collect`,
        typeArguments: [
          position.amountX.coin.coinType,
          position.amountY.coin.coinType,
        ],
        arguments: [
          tx.object(versionObject),
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
      const { packageId, versionObject } = FLOWX_V3_CONFIG;

      const collectResult = tx.moveCall({
        target: `${packageId}::position_manager::collect`,
        typeArguments: [
          position.amountX.coin.coinType,
          position.amountY.coin.coinType,
        ],
        arguments: [
          tx.object(versionObject),
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
      const { packageId, versionObject } = FLOWX_V3_CONFIG;
      const collectedReward = tx.moveCall({
        target: `${packageId}::position_manager::collect_reward`,
        typeArguments: [
          position.amountX.coin.coinType,
          position.amountY.coin.coinType,
          options.rewardCoin.coinType,
        ],
        arguments: [
          tx.object(versionObject),
          tx.object(position.pool.id),
          tx.object(position.id),
          tx.pure.bool(true), // collect all rewards
          tx.object(SUI_CLOCK_OBJECT_ID),
        ],
      });

      return collectedReward;
    };

  /**
   * Convert a tick number to i32 format for FlowX protocol
   * FlowX uses i32 representation for ticks
   */
  private _tickToI32(tick: number): TransactionArgument {
    // For FlowX, we need to create an i32 object
    // This is a simplified version - actual implementation may need to call i32::from
    return {
      kind: "Input",
      value: tick,
      type: "pure",
    } as any;
  }
}
