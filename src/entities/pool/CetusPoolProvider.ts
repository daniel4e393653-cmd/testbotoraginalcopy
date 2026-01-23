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
    const rawData = object.content["fields"] as CetusPoolRawData;

    const tokens = await Promise.all([
      getToken(`0x${rawData.coin_type_a.fields.name}`),
      getToken(`0x${rawData.coin_type_b.fields.name}`),
    ]);

    const pool = new Pool({
      objectId: object.objectId,
      coins: tokens,
      poolRewards: rawData.reward_infos.map((rewardInfo) => ({
        coin: new Coin(`0x${rewardInfo.fields.reward_coin_type.fields.name}`),
        endedAtSeconds: Number(rewardInfo.fields.ended_at_seconds),
        lastUpdateTime: Number(rewardInfo.fields.last_update_time),
        rewardPerSeconds: rewardInfo.fields.reward_per_seconds,
        totalReward: rewardInfo.fields.total_reward,
        rewardGrowthGlobal: rewardInfo.fields.reward_growth_global,
      })),
      reserves: [rawData.coin_a, rawData.coin_b],
      fee: Number(rawData.fee_rate),
      sqrtPriceX64: rawData.current_sqrt_price,
      tickCurrent: Number(
        BigInt.asIntN(TICK_INDEX_BITS, BigInt(rawData.current_tick_index.fields.bits))
      ),
      liquidity: rawData.liquidity,
      feeGrowthGlobalX: rawData.fee_growth_global_a,
      feeGrowthGlobalY: rawData.fee_growth_global_b,
      tickDataProvider: null, // Cetus uses different tick data provider
      protocol: Protocol.CETUS,
    });

    return pool;
  }
}
