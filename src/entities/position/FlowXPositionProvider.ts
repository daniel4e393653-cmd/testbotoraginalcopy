import invariant from "tiny-invariant";
import BN from "bn.js";
import { SuiObjectData } from "@mysten/sui/client";
import { normalizeSuiObjectId } from "@mysten/sui/utils";
import { Protocol, MAPPING_POSITION_OBJECT_TYPE } from "../../constants";
import { MIN_TICK, MAX_TICK } from "../../utils/clmmMath";

import { jsonRpcProvider } from "../../utils/jsonRpcProvider";
import { FlowXPoolProvider } from "../pool";
import { FlowXV3PositionRawData } from "../../types";
import { getLogger } from "../../utils/Logger";
import { IPositionProvider } from "./IPositionProvider";
import { Position } from "./Position";
import { extractTickIndex, alignTickToSpacing, clampTickToRange } from "../../utils/flowxHelper";

const logger = getLogger(module);

export class FlowXPositionProvider implements IPositionProvider {
  public async getPositionById(positionId: string): Promise<Position> {
    const object = await jsonRpcProvider.getObject({
      id: positionId,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
      },
    });

    invariant(
      object.data &&
        object.data.type === MAPPING_POSITION_OBJECT_TYPE[Protocol.FLOWX_V3],
      "invalid position"
    );

    return this._fromObjectData(object.data);
  }

  public async getLargestPosition(owner: string, poolId: string): Promise<Position | undefined> {
    let largestPosition: Position | undefined;
    let cursor,
      hasNextPage = false;
    do {
      const res = await jsonRpcProvider.getOwnedObjects({
        owner,
        filter: {
          StructType: MAPPING_POSITION_OBJECT_TYPE[Protocol.FLOWX_V3],
        },
        options: {
          showContent: true,
          showOwner: true,
          showType: true,
        },
        cursor,
      });

      cursor = res.nextCursor;
      hasNextPage = res.hasNextPage;
      for (const object of res.data) {
        try {
          const position = await this._fromObjectData(object.data);
          if (
            normalizeSuiObjectId(position.pool.id) ===
              normalizeSuiObjectId(poolId) &&
            (!largestPosition ||
              new BN(position.liquidity).gt(new BN(largestPosition.liquidity)))
          ) {
            largestPosition = position;
          }
        } catch (err) {
          logger.error(
            `Failed to parse position object ${object.data.objectId}, skipping`,
            err
          );
        }
      }
    } while (hasNextPage);

    if (!largestPosition) {
      logger.warn(`No position found for owner ${owner} and pool ${poolId}`);
    }
    return largestPosition;
  }

  private async _fromObjectData(object: SuiObjectData) {
    invariant(
      object.content && object.content.dataType === "moveObject",
      "object content must be a move object"
    );
    const rawData = object.content.fields as unknown as FlowXV3PositionRawData;

    const pool = await new FlowXPoolProvider().getPoolById(rawData.pool_id);

    // Extract raw tick values
    const tickLowerRaw = extractTickIndex(rawData.tick_lower_index, object.objectId, "tick_lower_index");
    const tickUpperRaw = extractTickIndex(rawData.tick_upper_index, object.objectId, "tick_upper_index");

    // Align ticks to pool's tick spacing to ensure they're valid
    // Round lower tick down and upper tick up to preserve tick ordering
    let tickLower = alignTickToSpacing(tickLowerRaw, pool.tickSpacing, false);
    let tickUpper = alignTickToSpacing(tickUpperRaw, pool.tickSpacing, true);

    // Clamp ticks to valid MIN_TICK/MAX_TICK range
    tickLower = clampTickToRange(tickLower, pool.tickSpacing, MIN_TICK, MAX_TICK);
    tickUpper = clampTickToRange(tickUpper, pool.tickSpacing, MIN_TICK, MAX_TICK);

    // Safety check: ensure tickLower < tickUpper after alignment and clamping
    if (tickLower >= tickUpper) {
      const alignedMax = Math.floor(MAX_TICK / pool.tickSpacing) * pool.tickSpacing;
      if (tickLower + pool.tickSpacing <= alignedMax) {
        tickUpper = tickLower + pool.tickSpacing;
      } else {
        tickUpper = alignedMax;
        tickLower = alignedMax - pool.tickSpacing;
      }
    }

    const position = new Position({
      objectId: object.objectId,
      liquidity: rawData.liquidity,
      owner: (object.owner && typeof object.owner === "object" && "AddressOwner" in object.owner) 
        ? (object.owner as any)["AddressOwner"] 
        : "",
      pool,
      tickLower,
      tickUpper,
      feeGrowthInsideXLast: rawData.fee_growth_inside_x_last,
      feeGrowthInsideYLast: rawData.fee_growth_inside_y_last,
      coinsOwedX: rawData.coins_owed_x,
      coinsOwedY: rawData.coins_owed_y,
      rewardInfos: (rawData.reward_infos || []).map((rewardInfo) => ({
        coinsOwedReward: rewardInfo.fields.coins_owed_reward,
        rewardGrowthInsideLast: rewardInfo.fields.reward_growth_inside_last,
      })),
    });

    return position;
  }
}
