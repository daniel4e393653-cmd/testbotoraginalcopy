import invariant from "tiny-invariant";
import { Coin } from "../../utils/Coin";
import { Protocol, MAPPING_POOL_OBJECT_TYPE } from "../../constants";
import { SuiObjectData } from "@mysten/sui/client";

import { Pool } from "./Pool";
import { jsonRpcProvider } from "../../utils/jsonRpcProvider";
import { getToken } from "../../utils/tokenHelper";
import { CetusPoolRawData } from "../../types";
import { IPoolProvder } from "./IPoolProvder";
import { extractTickIndex } from "../../utils/cetusHelper";
import { extractTypeArguments } from "../../utils/typeHelper";

export class CetusPoolProvider implements IPoolProvder {
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
      object.data && object.data.type.startsWith(MAPPING_POOL_OBJECT_TYPE[Protocol.CETUS]),
      "invalid pool"
    );

    return this._fromObjectData(object.data);
  }

  private async _fromObjectData(object: SuiObjectData): Promise<Pool> {
    invariant(
      object.content && object.content.dataType === "moveObject",
      "object content must be a move object"
    );
    const rawData = object.content.fields as unknown as CetusPoolRawData;

    // Extract coin types from either fields or type parameters
    let coinTypeA: string;
    let coinTypeB: string;

    // Try to get coin types from fields first (old structure)
    if (rawData.coin_type_a && 
        rawData.coin_type_a.fields && 
        rawData.coin_type_a.fields.name &&
        rawData.coin_type_b && 
        rawData.coin_type_b.fields && 
        rawData.coin_type_b.fields.name) {
      coinTypeA = `0x${rawData.coin_type_a.fields.name}`;
      coinTypeB = `0x${rawData.coin_type_b.fields.name}`;
    } else {
      // Fall back to extracting from type parameters (new structure)
      const typeArgs = extractTypeArguments(object.type);
      invariant(
        typeArgs && typeArgs.length >= 2,
        `Invalid pool data structure: Unable to extract coin types from either fields or type parameters for pool ${object.objectId}. Type: ${object.type}`
      );
      coinTypeA = typeArgs[0];
      coinTypeB = typeArgs[1];
    }

    const tokens = await Promise.all([
      getToken(coinTypeA),
      getToken(coinTypeB),
    ]);

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
      reserves: [rawData.coin_a, rawData.coin_b],
      fee: Number(rawData.fee_rate),
      sqrtPriceX64: rawData.current_sqrt_price,
      tickCurrent: extractTickIndex(rawData.current_tick_index, object.objectId, "current_tick_index"),
      tickSpacing: rawData.tick_spacing,
      liquidity: rawData.liquidity,
      feeGrowthGlobalX: rawData.fee_growth_global_a,
      feeGrowthGlobalY: rawData.fee_growth_global_b,
      tickDataProvider: null, // Cetus uses different tick data provider
      protocol: Protocol.CETUS,
    });

    return pool;
  }
}
