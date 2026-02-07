import BN from "bn.js";

export type BigintIsh = BN | string | number;

export enum Protocol {
  CETUS = "CETUS",
}

export type ClmmProtocol = Protocol.CETUS;

export enum Rounding {
  ROUND_DOWN,
  ROUND_HALF_UP,
  ROUND_UP,
}

export const TICK_INDEX_BITS = 32;
export const LIQUIDITY_BITS = 128;
export const Q128 = new BN(2).pow(new BN(128));

export const REBALANCE_RETRIES = Number(process.env.REBALANCE_RETRIES ?? 1);

export const CETUS_CONFIG = {
  packageId:
    "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb",
  poolsId:
    "0xf699e7f2276f5c9a75944b37a0c5b5d9ddfd2471bf6242483b03ab2887d198d0",
  globalConfigId:
    "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f",
  globalVaultId:
    "0xce7bceef26d3ad1f6d9b6f13a953f053e6ed3ca77907516481ce99ae8e588f2b",
  adminCapId:
    "0x89c1a321291d15ddae5a086c9abc533dff697fde3d89e0ca836c41af73e36a75",
};

export const MAPPING_POSITION_OBJECT_TYPE: Record<
  ClmmProtocol,
  string | undefined
> = {
  [Protocol.CETUS]:
    "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::position::Position",
};

export const MAPPING_POOL_OBJECT_TYPE: Record<
  ClmmProtocol,
  string | undefined
> = {
  [Protocol.CETUS]:
    "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::Pool",
};

export const BPS = 1_000_000;
export const MAX_U64 = "18446744073709551615";