import { ClmmPool, Coin, Percent } from "@flowx-finance/sdk";
import { TransactionArgument } from "@mysten/sui/transactions";
import { BigintIsh, ClmmProtocol } from "./constants";

export type MoveObject<T> = {
  fields: T;
  type: string;
};

export type ID = {
  id: string;
};

export type MoveTypeName = {
  name: string;
};

export type MoveInteger = {
  bits: number;
};

export interface RewardInfo {
  ended_at_seconds: string;
  last_update_time: string;
  reward_coin_type: MoveObject<MoveTypeName>;
  reward_growth_global: string;
  reward_per_seconds: string;
  total_reward: string;
  total_reward_allocated: string;
}

export interface PositionRewardInfo {
  coins_owed_reward: string;
  reward_growth_inside_last: string;
}

export type FlowXV3PoolRawData = {
  id: ID;
  coin_type_x: MoveObject<MoveTypeName>;
  coin_type_y: MoveObject<MoveTypeName>;
  liquidity: string;
  reserve_x: string;
  reserve_y: string;
  sqrt_price: string;
  swap_fee_rate: string;
  tick_index: MoveObject<MoveInteger>;
  tick_spacing: number;
  ticks: MoveObject<{ id: ID; size: string }>;
  fee_growth_global_x: string;
  fee_growth_global_y: string;
  reward_infos: MoveObject<RewardInfo>[];
};

export type FlowXV3PositionRawData = {
  id: ID;
  liquidity: string;
  pool_id: string;
  tick_lower_index: MoveObject<MoveInteger>;
  tick_upper_index: MoveObject<MoveInteger>;
  coins_owed_x: string;
  coins_owed_y: string;
  fee_growth_inside_x_last: string;
  fee_growth_inside_y_last: string;
  reward_infos: MoveObject<PositionRewardInfo>[];
};

export type CetusPoolRawData = {
  id: ID;
  coin_type_a?: MoveObject<MoveTypeName>;
  coin_type_b?: MoveObject<MoveTypeName>;
  liquidity: string;
  coin_a: string;
  coin_b: string;
  current_sqrt_price: string;
  current_tick_index: MoveObject<MoveInteger>;
  tick_spacing: number;
  fee_growth_global_a: string;
  fee_growth_global_b: string;
  fee_rate: string;
  reward_infos: MoveObject<RewardInfo>[];
};

export type CetusPositionRawData = {
  id: ID;
  liquidity: string;
  pool: string;
  tick_lower_index: MoveObject<MoveInteger>;
  tick_upper_index: MoveObject<MoveInteger>;
  fee_growth_inside_a: string;
  fee_owed_a: string;
  fee_growth_inside_b: string;
  fee_owed_b: string;
  reward_amount_owed_0: string;
  reward_amount_owed_1: string;
  reward_amount_owed_2: string;
  reward_growth_inside_0: string;
  reward_growth_inside_1: string;
  reward_growth_inside_2: string;
};

export type PriceFeedResponse = {
  id: string;
  attributes: Attributes;
};

export type Attributes = {
  asset_type: string;
  base: string;
  description: string;
  display_symbol: string;
  generic_symbol: string;
  quote_currency: string;
  schedule: string;
  symbol: string;
};

export type PriceResponse = {
  binary: Binary;
  parsed: Parsed[];
};

export type Binary = {
  encoding: string;
  data: string[];
};

export type Parsed = {
  id: string;
  price: Price;
  ema_price: Price;
  metadata: Metadata;
};

export type Price = {
  price: string;
  conf: string;
  expo: number;
  publish_time: number;
};

export type Metadata = {
  slot: number;
  proof_available_time: number;
  prev_publish_time: number;
};

export type FlowXV3CollectEvent = {
  amount_x: string;
  amount_y: string;
  pool_id: string;
  position_id: string;
  sender: string;
};

export type LiquidityOperationOptions = {
  slippageTolerance: Percent;
  deadline: number;
};

export type IncreaseLiquidityOptions = {
  coinXIn?: TransactionArgument;
  coinYIn?: TransactionArgument;
  createPosition?: boolean;
} & LiquidityOperationOptions;

export type DecreaseLiquidityOptions = LiquidityOperationOptions;

export type CollectOptions = {
  requestedAmountX?: BigintIsh;
  requestedAmountY?: BigintIsh;
};

export type CollectRewardsOptions = {
  rewardCoin: Coin;
  requestedAmount?: BigintIsh;
};
