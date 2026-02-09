import invariant from "tiny-invariant";
import { Coin } from "../../utils/Coin";
import { Protocol, MAPPING_POOL_OBJECT_TYPE } from "../../constants";
import { SuiObjectData } from "@mysten/sui/client";

import { Pool } from "./Pool";
import { jsonRpcProvider } from "../../utils/jsonRpcProvider";
import { getToken } from "../../utils/tokenHelper";
import { FlowXV3PoolRawData } from "../../types";
import { IPoolProvder } from "./IPoolProvder";
import { extractTypeArguments } from "../../utils/typeHelper";

export class FlowXPoolProvider implements IPoolProvder {
  public async getPoolById(poolId: string): Promise<Pool> {
    const object = await jsonRpcProvider.getObject({
      id: poolId,
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
      },
    });

    invariant(
      object.data && object.data.type.startsWith(MAPPING_POOL_OBJECT_TYPE[Protocol.FLOWX_V3]),
      "invalid pool"
    );

    return this._fromObjectData(object.data);
  }

  private async _fromObjectData(object: SuiObjectData): Promise<Pool> {
    invariant(
      object.content && object.content.dataType === "moveObject",
      "object content must be a move object"
    );
    const rawData = object.content.fields as unknown as FlowXV3PoolRawData;

    // Extract coin types from either fields or type parameters
    let coinTypeX: string;
    let coinTypeY: string;

    // Try to get coin types from fields first
    if (rawData.coin_type_x && 
        rawData.coin_type_x.fields && 
        rawData.coin_type_x.fields.name &&
        rawData.coin_type_y && 
        rawData.coin_type_y.fields && 
        rawData.coin_type_y.fields.name) {
      coinTypeX = `0x${rawData.coin_type_x.fields.name}`;
      coinTypeY = `0x${rawData.coin_type_y.fields.name}`;
    } else {
      // Fall back to extracting from type parameters
      const typeArgs = extractTypeArguments(object.type);
      invariant(
        typeArgs && typeArgs.length >= 2,
        `Invalid pool data structure: Unable to extract coin types from either fields or type parameters for pool ${object.objectId}. Type: ${object.type}`
      );
      coinTypeX = typeArgs[0];
      coinTypeY = typeArgs[1];
    }

    const tokens = await Promise.all([
      getToken(coinTypeX),
      getToken(coinTypeY),
    ]);

    // Extract tick_index from MoveInteger structure
    const tickCurrent = rawData.tick_index?.fields?.bits 
      ? Number(rawData.tick_index.fields.bits)
      : 0;

    const pool = new Pool({
      objectId: object.objectId,
      coins: tokens,
      poolRewards: (rawData.reward_infos || []).map((rewardInfo, index) => {
        invariant(
          rewardInfo.fields && 
          rewardInfo.fields.reward_coin_type && 
          rewardInfo.fields.reward_coin_type.fields &&
          rewardInfo.fields.reward_coin_type.fields.name,
          `Invalid reward info structure at index ${index} for pool ${object.objectId}`
        );
        return {
          coin: new Coin(`0x${rewardInfo.fields.reward_coin_type.fields.name}`),
          endedAtSeconds: Number(rewardInfo.fields.ended_at_seconds),
          lastUpdateTime: Number(rewardInfo.fields.last_update_time),
          rewardPerSeconds: rewardInfo.fields.reward_per_seconds,
          totalReward: rewardInfo.fields.total_reward,
          rewardGrowthGlobal: rewardInfo.fields.reward_growth_global,
        };
      }),
      reserves: [rawData.reserve_x, rawData.reserve_y],
      fee: Number(rawData.swap_fee_rate),
      sqrtPriceX64: rawData.sqrt_price,
      tickCurrent,
      tickSpacing: rawData.tick_spacing,
      liquidity: rawData.liquidity,
      feeGrowthGlobalX: rawData.fee_growth_global_x,
      feeGrowthGlobalY: rawData.fee_growth_global_y,
      tickDataProvider: null,
      protocol: Protocol.FLOWX_V3,
    });

    return pool;
  }
}
