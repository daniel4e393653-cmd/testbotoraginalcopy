# Cetus Integration Setup Guide

This guide will help you set up and run the rebalancer bot with Cetus protocol.

## Prerequisites

1. Node.js and Yarn installed
2. A Sui wallet with private key
3. Sufficient SUI tokens for gas fees
4. Liquidity position in a Cetus pool (or tokens to create one)

## Quick Start

### 1. Install Dependencies

```bash
yarn install
```

### 2. Build the Project

```bash
yarn build
```

### 3. Configure Environment Variables

Copy the Cetus example configuration:

```bash
cp .env.cetus.example .env
```

Or create a `.env` file manually with the following required variables:

```env
# REQUIRED: Sui RPC Endpoint
JSON_RPC_ENDPOINT=https://fullnode.mainnet.sui.io:443

# REQUIRED: Protocol Configuration
PROTOCOL=CETUS
TARGET_POOL=0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105

# REQUIRED: Price Range (in basis points)
BPRICE_PERCENT=500      # 0.05% below current price
TPRICE_PERCENT=500      # 0.05% above current price

# REQUIRED: Trading Parameters
SLIPPAGE_TOLERANCE=1000                    # 0.1%
PRICE_IMPACT_PERCENT_THRESHOLD=3000        # 0.3%

# REQUIRED: Minimum Amounts
MIN_ZAP_AMOUNT_X=1000000
MIN_ZAP_AMOUNT_Y=1000000

# REQUIRED: Position Settings
MULTIPLIER=1
REBALANCE_RETRIES=3

# REQUIRED: Reward Compounding
REWARD_THRESHOLD_USD=1
COMPOUND_REWARDS_SCHEDULE_MS=3600000

# REQUIRED: Your Sui Wallet Private Key
PRIVATE_KEY=your_private_key_here
```

### 4. Important Configuration Notes

#### JSON_RPC_ENDPOINT
- **This is REQUIRED** - the bot will fail with a clear error message if not set
- You can use public endpoints like `https://fullnode.mainnet.sui.io:443`
- Or use your own RPC endpoint for better performance

#### PRIVATE_KEY
- **This is REQUIRED** - your Sui wallet private key
- Get it from your wallet (Sui Wallet, Suiet, etc.)
- Format: `suiprivkey1...` (includes the prefix)
- **Keep this secret and never commit it to git**

#### TARGET_POOL
- The Cetus pool ID you want to rebalance
- Example: `0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105`
- You can find pool IDs on the Cetus app

#### Price Range (BPRICE_PERCENT and TPRICE_PERCENT)
- Specified in basis points (100 = 0.01%)
- For Cetus, typical values are 500-5000 (0.05%-0.5%)
- Tighter ranges = more concentrated liquidity = higher fees but more frequent rebalancing
- Wider ranges = less frequent rebalancing but lower fee capture

#### Minimum Zap Amounts
- Adjust based on your token decimals
- For 6-decimal tokens: 1000000 = 1 token
- For 9-decimal tokens: 1000000000 = 1 token

### 5. Run the Bot

```bash
node dist/index.js
```

The bot will:
1. Load your configuration
2. Connect to the Sui network
3. Find your largest position in the target pool
4. Monitor price movements
5. Automatically rebalance when needed
6. Compound rewards based on schedule

## Troubleshooting

### Error: "JSON_RPC_ENDPOINT environment variable is required"

**Solution**: Make sure you have a `.env` file with `JSON_RPC_ENDPOINT` set.

```bash
# Check if .env exists
ls -la .env

# Verify it contains JSON_RPC_ENDPOINT
cat .env | grep JSON_RPC_ENDPOINT
```

### Error: "Failed to parse URL from undefined"

**Solution**: This was the old error. After this fix, you should see the clearer error message above. Make sure you have the latest build:

```bash
yarn build
```

### Error: "Invalid checksum in suiprivkey..."

**Solution**: Your private key format is incorrect. Get the correct private key from your Sui wallet.

### Error: "No position found for owner..."

**Solution**: You don't have a position in the specified pool. Either:
1. Create a position manually in the Cetus app first
2. Or change TARGET_POOL to a pool where you have a position

## Best Practices

1. **Start with small amounts** to test the configuration
2. **Monitor the bot** for the first few rebalancing cycles
3. **Adjust price ranges** based on market volatility
4. **Set appropriate reward thresholds** to avoid excessive gas fees
5. **Keep your private key secure** - use environment variables, not hardcoded values

## Support

For issues or questions:
1. Check the main README.md for general information
2. Review the configuration examples in .env.example and .env.cetus.example
3. Ensure all dependencies are installed and the project builds successfully

## Security Notes

- Never commit your `.env` file to git (it's in .gitignore)
- Never share your PRIVATE_KEY
- Use a dedicated wallet for the bot with only necessary funds
- Monitor transactions on a Sui explorer
