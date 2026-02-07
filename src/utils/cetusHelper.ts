import invariant from "tiny-invariant";
import { TICK_INDEX_BITS } from "../constants";
import { MoveInteger, MoveObject } from "../types";

/**
 * Extracts tick index from Cetus data structure
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
