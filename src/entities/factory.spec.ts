import { Protocol } from "@flowx-finance/sdk";
import { createPositionProvider, createPositionManager } from "./factory";
import { FlowXV3PositionProvider, CetusPositionProvider } from "./position";
import { FlowXV3PositionManager, CetusPositionManager } from "./position";

describe("Factory", () => {
  describe("createPositionProvider", () => {
    it("should create FlowXV3PositionProvider for FLOWX_V3 protocol", () => {
      const provider = createPositionProvider(Protocol.FLOWX_V3);
      expect(provider).toBeInstanceOf(FlowXV3PositionProvider);
    });

    it("should create CetusPositionProvider for CETUS protocol", () => {
      const provider = createPositionProvider(Protocol.CETUS);
      expect(provider).toBeInstanceOf(CetusPositionProvider);
    });

    it("should throw error for unsupported protocol", () => {
      expect(() => {
        createPositionProvider("INVALID_PROTOCOL" as any);
      }).toThrow("Unsupported protocol");
    });
  });

  describe("createPositionManager", () => {
    it("should create FlowXV3PositionManager for FLOWX_V3 protocol", () => {
      const manager = createPositionManager(Protocol.FLOWX_V3);
      expect(manager).toBeInstanceOf(FlowXV3PositionManager);
    });

    it("should create CetusPositionManager for CETUS protocol", () => {
      const manager = createPositionManager(Protocol.CETUS);
      expect(manager).toBeInstanceOf(CetusPositionManager);
    });

    it("should throw error for unsupported protocol", () => {
      expect(() => {
        createPositionManager("INVALID_PROTOCOL" as any);
      }).toThrow("Unsupported protocol");
    });
  });

  describe("Protocol-agnostic behavior", () => {
    it("should create providers and managers that implement the same interface", () => {
      const flowxProvider = createPositionProvider(Protocol.FLOWX_V3);
      const cetusProvider = createPositionProvider(Protocol.CETUS);

      // Both should have the same methods
      expect(typeof flowxProvider.getPositionById).toBe("function");
      expect(typeof flowxProvider.getLargestPosition).toBe("function");
      expect(typeof cetusProvider.getPositionById).toBe("function");
      expect(typeof cetusProvider.getLargestPosition).toBe("function");

      const flowxManager = createPositionManager(Protocol.FLOWX_V3);
      const cetusManager = createPositionManager(Protocol.CETUS);

      // Both should have the same methods
      expect(typeof flowxManager.openPosition).toBe("function");
      expect(typeof flowxManager.closePosition).toBe("function");
      expect(typeof flowxManager.increaseLiquidity).toBe("function");
      expect(typeof flowxManager.decreaseLiquidity).toBe("function");
      expect(typeof flowxManager.collect).toBe("function");
      expect(typeof flowxManager.collectReward).toBe("function");

      expect(typeof cetusManager.openPosition).toBe("function");
      expect(typeof cetusManager.closePosition).toBe("function");
      expect(typeof cetusManager.increaseLiquidity).toBe("function");
      expect(typeof cetusManager.decreaseLiquidity).toBe("function");
      expect(typeof cetusManager.collect).toBe("function");
      expect(typeof cetusManager.collectReward).toBe("function");
    });
  });
});
