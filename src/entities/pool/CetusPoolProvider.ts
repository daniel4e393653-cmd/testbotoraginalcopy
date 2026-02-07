import invariant from "tiny-invariant";
import { Coin, Protocol } from "@flowx-finance/sdk";
import { SuiObjectData } from "@mysten/sui/client";

import { Pool } from "./Pool";
import { jsonRpcProvider } from "../../utils/jsonRpcProvider";
import { getToken } from "../../utils/tokenHelper";
import { MAPPING_POOL_OBJECT_TYPE, TICK_INDEX_BITS } from "../../constants";
import { CetusPoolRawData } from "../../types";
import { IPoolProvder } from "./IPoolProvder";

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

    invariant(
      rawData.coin_type_a && rawData.coin_type_a.fields,
      `Invalid pool data structure: coin_type_a is missing or malformed for pool ${object.objectId}`
    );
    invariant(
      rawData.coin_type_b && rawData.coin_type_b.fields,
      `Invalid pool data structure: coin_type_b is missing or malformed for pool ${object.objectId}`
    );

    const tokens = await Promise.all([
      getToken(`0x${rawData.coin_type_a.fields.name}`),
      getToken(`0x${rawData.coin_type_b.fields.name}`),
    ]);

    const pool = new Pool({
      objectId: object.objectId,
      coins: tokens,
      poolRewards: rawData.reward_infos.map((rewardInfo) => {
        invariant(
          rewardInfo.fields && rewardInfo.fields.reward_coin_type && rewardInfo.fields.reward_coin_type.fields,
          `Invalid reward info structure for pool ${object.objectId}`
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
      tickCurrent: (() => {
        if (rawData.current_tick_index?.fields?.bits !== undefined) {
          return Number(BigInt.asIntN(TICK_INDEX_BITS, BigInt(rawData.current_tick_index.fields.bits)));
        }
        // Fallback for direct tick index value (if structure differs)
        if (typeof rawData.current_tick_index === 'number' || typeof rawData.current_tick_index === 'string') {
          return Number(BigInt.asIntN(TICK_INDEX_BITS, BigInt(rawData.current_tick_index)));
        }
        invariant(false, `Invalid current_tick_index structure for pool ${object.objectId}`);
      })(),
      liquidity: rawData.liquidity,
      feeGrowthGlobalX: rawData.fee_growth_global_a,
      feeGrowthGlobalY: rawData.fee_growth_global_b,
      tickDataProvider: null, // Cetus uses different tick data provider
      protocol: Protocol.CETUS,
    });

    return pool;
  }
}
