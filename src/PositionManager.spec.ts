import { BN } from "bn.js";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

import { Percent } from "./utils/Percent";
import { BPS } from "./constants";
import { PositionManager } from "./PositionManager";

describe("#PositionManager", () => {
  const manager = new PositionManager({
    slippageTolerance: new Percent(5000, BPS),
    priceImpactPercentThreshold: new Percent(5000, BPS),
    minZapAmounts: {
      amountX: new BN(100),
      amountY: new BN(100),
    },
    trackingVolumeAddress: Ed25519Keypair.generate()
      .getPublicKey()
      .toSuiAddress(),
  });

  it("should construct without errors", () => {
    expect(manager).toBeDefined();
  });
});
