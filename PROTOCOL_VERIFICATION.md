# FlowX and Cetus Protocol Support Verification

## Overview

This document verifies that the bot works for both **Cetus** and **FlowX** protocols with the **same logic**.

## Architecture

The bot uses a **protocol-agnostic architecture** that separates the core business logic from protocol-specific implementations:

### Core Logic (Protocol-Independent)
- **Worker.ts**: Main orchestrator that runs the rebalancing logic
- **PositionManager.ts**: Abstract interface for position operations
- **IPositionProvider**: Abstract interface for fetching position data
- **IPoolProvider**: Abstract interface for fetching pool data

### Protocol-Specific Implementations

#### Cetus Protocol
- `CetusPoolProvider`: Implements IPoolProvider for Cetus
- `CetusPositionProvider`: Implements IPositionProvider for Cetus
- `CetusPositionManager`: Implements PositionManager for Cetus

#### FlowX V3 Protocol
- `FlowXPoolProvider`: Implements IPoolProvider for FlowX
- `FlowXPositionProvider`: Implements IPositionProvider for FlowX
- `FlowXPositionManager`: Implements PositionManager for FlowX

## How the Same Logic Works for Both Protocols

### 1. Factory Pattern
The `factory.ts` file dynamically creates the appropriate provider based on the protocol:

```typescript
export const createPositionProvider = (protocol: ClmmProtocol): IPositionProvider => {
  switch (protocol) {
    case Protocol.CETUS:
      return new CetusPositionProvider();
    case Protocol.FLOWX_V3:
      return new FlowXPositionProvider();
    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
};
```

### 2. Worker Uses Interfaces Only
The Worker class in `Worker.ts` only interacts with the abstract interfaces:

```typescript
this.positionProvider = createPositionProvider(options.protocol);
```

It doesn't know or care whether it's using Cetus or FlowX - it just calls:
- `positionProvider.getLargestPosition(owner, poolId)`
- `positionProvider.getPositionById(positionId)`
- `positionManager.migrate(position, tickLower, tickUpper)`
- `positionManager.compound(position)`

### 3. Same Rebalancing Logic
The core rebalancing logic in `Worker.ts` is identical for both protocols:

```typescript
private async rebalanceIfNecessary() {
  const pool = this.position.pool;
  const activeTicks = closestActiveRange(pool, this.multiplier);
  const activePriceRange = new PriceRange(...);
  
  // Calculate target ticks based on price range
  // This logic is the SAME for both protocols
  
  if (targetTickLower !== this.position.tickLower || 
      targetTickUpper !== this.position.tickUpper) {
    await this.executeRebalance(position, targetTickLower, targetTickUpper);
  }
}
```

### 4. Same Compound Logic
The compounding logic is also protocol-agnostic:

```typescript
private async compoundIfNecessary() {
  // Check if price is out of range
  // Check if enough time has elapsed
  // These checks are IDENTICAL for both protocols
  
  if (elapsedTimeMs > this.compoundRewardsScheduleMs) {
    await this.executeCompound(this.position);
  }
}
```

## Configuration

### Using Cetus
```env
PROTOCOL=CETUS
TARGET_POOL=0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105
```

### Using FlowX V3
```env
PROTOCOL=FLOWX_V3
TARGET_POOL=0x88cec280ed5406af7951ef768b305de5323b843cc127bcab988d08770d00a5f7
```

## Verification Summary

✅ **Same Core Logic**: The Worker class uses the same rebalancing and compounding logic for both protocols

✅ **Protocol-Specific Adapters**: Each protocol has its own adapters that implement the same interfaces

✅ **No Logic Duplication**: The business logic is written once and works for both protocols

✅ **Easy to Extend**: New protocols can be added by implementing the same interfaces

## Implementation Details

Both implementations follow the same pattern:

1. **Pool Provider**: Fetches pool data from the blockchain
   - Extracts coin types
   - Parses pool state (liquidity, price, ticks, fees)
   - Handles reward information

2. **Position Provider**: Fetches position data
   - Gets positions by ID
   - Finds largest position for an owner
   - Handles tick alignment and clamping

3. **Position Manager**: Executes transactions
   - Opens/closes positions
   - Adds/removes liquidity
   - Collects fees and rewards

All three components use the same data structures (Pool, Position, etc.) and the same helper utilities (price calculations, tick math, etc.).

## Conclusion

The bot successfully implements **the same logic** for both Cetus and FlowX protocols through:
- **Interface-based design**
- **Factory pattern** for protocol selection
- **Protocol-agnostic core logic**
- **Protocol-specific adapters**

This design ensures that both protocols benefit from the same battle-tested rebalancing and compounding logic while handling protocol-specific transaction formats.
