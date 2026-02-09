import invariant from "tiny-invariant";
import { TICK_INDEX_BITS } from "../constants";
import { MoveInteger, MoveObject } from "../types";

/**
 * Extracts tick index from FlowX data structure
 * Handles both nested object structure (MoveObject<MoveInteger>) and direct primitive values
 * @param tickIndex - The tick index value from the API (can be nested object or direct value)
 * @param objectId - The object ID for error reporting
 * @param fieldName - Name of the field being extracted (for error messages)
 * @returns The extracted tick index as a number
 */
export function extractTickIndex(
  tickIndex: MoveObject<MoveInteger> | number | string | undefined,
  objectId: string,
  fieldName: string
): number {
  // Try nested structure first (expected structure)
  if (
    tickIndex &&
    typeof tickIndex === "object" &&
    "fields" in tickIndex &&
    tickIndex.fields?.bits != null
  ) {
    // Convert to signed 32-bit integer, then to Number
    // Note: This assumes tick values are within JavaScript's safe integer range (-2^31 to 2^31-1)
    // which is valid for CLMM ticks (typically ranging from -887272 to 887272)
    return Number(BigInt.asIntN(TICK_INDEX_BITS, BigInt(tickIndex.fields.bits)));
  }

  // Fallback for direct tick index value (if structure differs from types)
  if (typeof tickIndex === "number" || typeof tickIndex === "string") {
    return Number(BigInt.asIntN(TICK_INDEX_BITS, BigInt(tickIndex)));
  }

  // If we reach here, the structure is invalid
  invariant(
    false,
    `Invalid ${fieldName} structure for object ${objectId}: expected MoveObject<MoveInteger> or primitive value`
  );
}

/**
 * Aligns a tick index to the nearest valid tick based on tick spacing
 * @param tick - The tick index to align
 * @param tickSpacing - The pool's tick spacing
 * @param roundUp - If true, rounds up (ceil); if false, rounds down (floor); if undefined, rounds to nearest
 * @returns The aligned tick index
 */
export function alignTickToSpacing(tick: number, tickSpacing: number, roundUp?: boolean): number {
  if (roundUp === true) {
    return Math.ceil(tick / tickSpacing) * tickSpacing;
  }
  if (roundUp === false) {
    return Math.floor(tick / tickSpacing) * tickSpacing;
  }
  return Math.round(tick / tickSpacing) * tickSpacing;
}

/**
 * Clamps a tick to the valid [minTick, maxTick] range, aligned to tick spacing.
 * @param tick - The tick index to clamp
 * @param tickSpacing - The pool's tick spacing
 * @param minTick - Minimum allowed tick (e.g., ClmmTickMath.MIN_TICK)
 * @param maxTick - Maximum allowed tick (e.g., ClmmTickMath.MAX_TICK)
 * @returns The clamped tick index, aligned to tickSpacing
 */
export function clampTickToRange(tick: number, tickSpacing: number, minTick: number, maxTick: number): number {
  const alignedMin = Math.ceil(minTick / tickSpacing) * tickSpacing;
  const alignedMax = Math.floor(maxTick / tickSpacing) * tickSpacing;
  return Math.max(alignedMin, Math.min(alignedMax, tick));
}
