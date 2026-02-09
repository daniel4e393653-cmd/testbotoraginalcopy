import BN from "bn.js";

export type BigintIsh = BN | string | number;

export enum Protocol {
  CETUS = "CETUS",
  FLOWX_V3 = "FLOWX_V3",
}

export type ClmmProtocol = Protocol.CETUS | Protocol.FLOWX_V3;

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

export const FLOWX_V3_CONFIG = {
  packageId:
    "0xde2c47eb0da8c74e4d0f6a220c41619681221b9c2590518095f0f0c2d3f3c772",
  poolRegistryObject:
    "0x3d4a3ec73c767afa9ab78ef42e3ff1f43628e91dcafc55e3e0a7f3bc677d3bba",
  positionRegistryObject:
    "0xd75bf2ab4c0ae3e3e45e0e3e64d5bd6a36b5835ae84a10e5e3bb9d50e8ef7a4d",
  versionObject:
    "0xf7b8c3e41cde89b0f5c6e5e2e3e0e1e2e3e4e5e6e7e8e9e0e1e2e3e4e5e6e7e8",
};

export const MAPPING_POSITION_OBJECT_TYPE: Record<
  ClmmProtocol,
  string | undefined
> = {
  [Protocol.CETUS]:
    "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::position::Position",
  [Protocol.FLOWX_V3]:
    "0x25929e7f29e0a30eb4e692952ba1b5b65a3a4d65ab5f2a32e1ba3edcb587f26d::position::Position",
};

export const MAPPING_POOL_OBJECT_TYPE: Record<
  ClmmProtocol,
  string | undefined
> = {
  [Protocol.CETUS]:
    "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::Pool",
  [Protocol.FLOWX_V3]:
    "0x25929e7f29e0a30eb4e692952ba1b5b65a3a4d65ab5f2a32e1ba3edcb587f26d::pool::Pool",
};

export const BPS = 1_000_000;
export const MAX_U64 = "18446744073709551615";