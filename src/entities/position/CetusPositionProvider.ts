import invariant from "tiny-invariant";
import BN from "bn.js";
import { SuiObjectData } from "@mysten/sui/client";
import { normalizeSuiObjectId } from "@mysten/sui/utils";
import { Protocol } from "@flowx-finance/sdk";

import { jsonRpcProvider } from "../../utils/jsonRpcProvider";
import { MAPPING_POSITION_OBJECT_TYPE, TICK_INDEX_BITS } from "../../constants";
import { CetusPoolProvider } from "../pool";
import { CetusPositionRawData } from "../../types";
import { getLogger } from "../../utils/Logger";
import { IPositionProvider } from "./IPositionProvider";
import { Position } from "./Position";

const logger = getLogger(module);

export class CetusPositionProvider implements IPositionProvider {
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
        object.data.type === MAPPING_POSITION_OBJECT_TYPE[Protocol.CETUS],
      "invalid position"
    );

    return this._fromObjectData(object.data);
  }

  public async getLargestPosition(owner: string, poolId: string) {
    let largestPosition: Position;
    let cursor,
      hasNextPage = false;
    do {
      const res = await jsonRpcProvider.getOwnedObjects({
        owner,
        filter: {
          StructType: MAPPING_POSITION_OBJECT_TYPE[Protocol.CETUS],
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
            `Failed to parse position object ${object.data.objectId}`,
            err
          );
          throw err;
        }
      }
    } while (hasNextPage);

    invariant(
      largestPosition,
      `No position found for owner ${owner} and pool ${poolId}`
    );
    return largestPosition;
  }

  private async _fromObjectData(object: SuiObjectData) {
    invariant(
      object.content && object.content.dataType === "moveObject",
      "object content must be a move object"
    );
    const rawData = object.content.fields as unknown as CetusPositionRawData;

    const pool = await new CetusPoolProvider().getPoolById(rawData.pool);

    const position = new Position({
      objectId: object.objectId,
      liquidity: rawData.liquidity,
      owner: object.owner["AddressOwner"] ?? "",
      pool,
      tickLower: Number(
        BigInt.asIntN(
          TICK_INDEX_BITS,
          BigInt(rawData.tick_lower_index.fields.bits)
        )
      ),
      tickUpper: Number(
        BigInt.asIntN(
          TICK_INDEX_BITS,
          BigInt(rawData.tick_upper_index.fields.bits)
        )
      ),
      feeGrowthInsideXLast: rawData.fee_growth_inside_a,
      feeGrowthInsideYLast: rawData.fee_growth_inside_b,
      coinsOwedX: rawData.fee_owed_a,
      coinsOwedY: rawData.fee_owed_b,
      rewardInfos: [
        {
          coinsOwedReward: rawData.reward_amount_owed_0,
          rewardGrowthInsideLast: rawData.reward_growth_inside_0,
        },
        {
          coinsOwedReward: rawData.reward_amount_owed_1,
          rewardGrowthInsideLast: rawData.reward_growth_inside_1,
        },
        {
          coinsOwedReward: rawData.reward_amount_owed_2,
          rewardGrowthInsideLast: rawData.reward_growth_inside_2,
        },
      ],
    });

    return position;
  }
}
