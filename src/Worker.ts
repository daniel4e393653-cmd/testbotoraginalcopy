import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { nowInMilliseconds, Percent } from "@flowx-finance/sdk";
import BN from "bn.js";
import invariant from "tiny-invariant";

import {
  createPositionProvider,
  Pool,
  IPositionProvider,
  Position,
} from "./entities";
import { jsonRpcProvider } from "./utils/jsonRpcProvider";
import { closestActiveRange, isOutOfRange } from "./utils/poolHelper";
import { PositionManager } from "./PositionManager";
import { sleep } from "./utils/thread";
import { getLogger } from "./utils/Logger";
import { tickToPrice } from "./utils/priceTickConversions";
import { PriceRange } from "./utils/PriceRange";
import { CachingSuiTransactionExecutor } from "./sui-tx-execution/CachingSuiTransactionExecutor";
import { ClmmProtocol, MAPPING_POSITION_OBJECT_TYPE } from "./constants";

export type WorkerOptions = {
  protocol: ClmmProtocol;
  poolId: string;
  bPricePercent: Percent;
  tPricePercent: Percent;
  slippageTolerance: Percent;
  priceImpactPercentThreshold?: Percent;
  minZapAmount: { amountX: BigInt | number; amountY: BigInt | number };
  multiplier: number;
  rewardThresholdUsd: number;
  compoundRewardsScheduleMs: number;
  trackingVolumeAddress?: string;
};

export class Worker {
  private isStarted = false;
  private nextTickTimer = 5000;
  private processingTimeout = 300000;
  private lastCompoundRewardAt: number;

  private poolId: string;
  private signer: Ed25519Keypair;
  private bPricePercent: Percent;
  private tPricePercent: Percent;
  private positionManager: PositionManager;
  private multiplier: number;
  private compoundRewardsScheduleMs: number;
  private txExecutor: CachingSuiTransactionExecutor;
  private logger = getLogger(module);

  private position: Position;
  private positionProvider: IPositionProvider;

  constructor(options: WorkerOptions, privateKey: string) {
    this.poolId = options.poolId;
    this.signer = Ed25519Keypair.fromSecretKey(
      decodeSuiPrivateKey(privateKey).secretKey
    );
    this.bPricePercent = options.bPricePercent;
    this.tPricePercent = options.tPricePercent;
    this.positionManager = new PositionManager({
      slippageTolerance: options.slippageTolerance,
      priceImpactPercentThreshold: options.priceImpactPercentThreshold,
      minZapAmounts: {
        amountX: new BN(options.minZapAmount.amountX.toString()),
        amountY: new BN(options.minZapAmount.amountY.toString()),
      },
      rewardThresholdUsd: !isNaN(options.rewardThresholdUsd)
        ? new BN(options.rewardThresholdUsd)
        : undefined,
      trackingVolumeAddress: options.trackingVolumeAddress,
    });
    this.multiplier = options.multiplier;
    this.compoundRewardsScheduleMs = options.compoundRewardsScheduleMs;
    this.txExecutor = new CachingSuiTransactionExecutor({
      client: jsonRpcProvider,
    });
    this.positionProvider = createPositionProvider(options.protocol);
  }

  public start(): void {
    if (this.isStarted) return;
    this.isStarted = true;
    this.lastCompoundRewardAt = nowInMilliseconds();
    this.onTick();
  }

  private onTick(): void {
    const timer = setTimeout(() => {
      this.logger.error("Worker timeout, restarting...");
      process.exit(1);
    }, this.processingTimeout);

    this.doProcess()
      .then(() => {
        clearTimeout(timer);
        setTimeout(() => this.onTick(), this.nextTickTimer);
      })
      .catch((err) => {
        clearTimeout(timer);
        this.logger.error("Worker error:", err);
        setTimeout(() => this.onTick(), this.nextTickTimer);
      });
  }

  private async doProcess() {
    await this.synchronize();

    this.logger.info(
      `Start tracking position ${JSON.stringify({
        id: this.position.id,
        tickLower: this.position.tickLower,
        tickUpper: this.position.tickUpper,
        liquidity: this.position.liquidity.toString(),
      })}`
    );

    await this.rebalanceIfNecessary();
    await this.compoundIfNecessary();
  }

  private async synchronize() {
    if (!this.position) {
      const position = await this.positionProvider.getLargestPosition(
        this.signer.toSuiAddress(),
        this.poolId
      );
      if (!position) {
        throw new Error(
          `No position found for owner ${this.signer.toSuiAddress()} and pool ${this.poolId}. ` +
          `Ensure you have an open position in this pool.`
        );
      }
      this.position = position;
    } else {
      this.position = await this.positionProvider.getPositionById(
        this.position.id
      );
    }
  }

  private async rebalanceIfNecessary() {
    const pool = this.position.pool;
    const activeTicks = closestActiveRange(pool, this.multiplier);
    const activePriceRange = new PriceRange(
      activeTicks[0],
      activeTicks[1],
      this.bPricePercent,
      this.tPricePercent
    );

    let [targetTickLower, targetTickUpper] = isOutOfRange(
      this.position,
      this.multiplier
    )
      ? [activeTicks[0], activeTicks[1]]
      : [this.position.tickLower, this.position.tickUpper];

    const currentSqrtPriceX64 = new BN(pool.sqrtPriceX64);

    if (currentSqrtPriceX64.lt(activePriceRange.bPriceLower)) {
      targetTickLower = activeTicks[0] - pool.tickSpacing;
      targetTickUpper = activeTicks[1];
    } else if (currentSqrtPriceX64.gt(activePriceRange.bPriceUpper)) {
      targetTickLower = activeTicks[0];
      targetTickUpper = activeTicks[1] + pool.tickSpacing;
    }

    if (
      targetTickLower !== this.position.tickLower ||
      targetTickUpper !== this.position.tickUpper
    ) {
      const newPositionId = await this.executeRebalance(
        this.position,
        targetTickLower,
        targetTickUpper
      );
      this.lastCompoundRewardAt = nowInMilliseconds();

      if (newPositionId) {
        await sleep(5000);
        this.position = await this.positionProvider.getPositionById(
          newPositionId
        );
      }
    }
  }

  // ✅ FIXED FUNCTION — STOPS SELF COMPOUND LOOP
  private async compoundIfNecessary() {
    const pool = this.position.pool;

    // 🛑 DO NOT COMPOUND IF PRICE IS STILL IN RANGE
    if (
      pool.tickCurrent >= this.position.tickLower &&
      pool.tickCurrent <= this.position.tickUpper
    ) {
      this.logger.info("⏸ Skip compound: price still in range");
      return;
    }

    const elapsedTimeMs = nowInMilliseconds() - this.lastCompoundRewardAt;

    if (
      !isNaN(this.compoundRewardsScheduleMs) &&
      elapsedTimeMs > this.compoundRewardsScheduleMs
    ) {
      await this.executeCompound(this.position);
      this.lastCompoundRewardAt = nowInMilliseconds();
    }
  }

  private async executeRebalance(
    position: Position,
    tickLower: number,
    tickUpper: number
  ) {
    const tx = new Transaction();
    await this.positionManager.migrate(position, tickLower, tickUpper)(tx);

    const res = await jsonRpcProvider.signAndExecuteTransaction({
      transaction: tx,
      signer: this.signer,
      options: { showEffects: true, showObjectChanges: true },
    });

    invariant(res.effects.status.status === "success");

    return res.objectChanges?.find(
      (o) =>
        o.type === "created" &&
        o.objectType ===
          MAPPING_POSITION_OBJECT_TYPE[(position.pool as Pool).protocol]
    )?.["objectId"];
  }

  private async executeCompound(position: Position) {
    const tx = new Transaction();
    await this.positionManager.compound(position)(tx);

    const res = await jsonRpcProvider.signAndExecuteTransaction({
      transaction: tx,
      signer: this.signer,
      options: { showEffects: true },
    });

    invariant(res.effects.status.status === "success");

    this.logger.info(
      `Compound position successful, position_id=${position.id}, tx=${res.digest}`
    );
  }
}
