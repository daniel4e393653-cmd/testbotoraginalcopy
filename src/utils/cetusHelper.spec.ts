import { alignTickToSpacing, extractTickIndex, clampTickToRange } from "./cetusHelper";

describe("cetusHelper", () => {
  describe("alignTickToSpacing", () => {
    it("should return tick unchanged when already aligned", () => {
      expect(alignTickToSpacing(120, 60)).toBe(120);
      expect(alignTickToSpacing(0, 60)).toBe(0);
      expect(alignTickToSpacing(-120, 60)).toBe(-120);
    });

    it("should round tick to nearest spacing", () => {
      expect(alignTickToSpacing(121, 60)).toBe(120);
      expect(alignTickToSpacing(149, 60)).toBe(120);
      expect(alignTickToSpacing(150, 60)).toBe(180);
      expect(alignTickToSpacing(151, 60)).toBe(180);
    });

    it("should handle negative ticks correctly", () => {
      expect(alignTickToSpacing(-121, 60)).toBe(-120);
      expect(alignTickToSpacing(-149, 60)).toBe(-120);
      // Math.round(-150/60) = Math.round(-2.5) = -2 (rounds toward positive infinity)
      expect(alignTickToSpacing(-150, 60)).toBe(-120);
      expect(alignTickToSpacing(-151, 60)).toBe(-180);
    });

    it("should work with different tick spacings", () => {
      expect(alignTickToSpacing(101, 10)).toBe(100);
      // Math.round(105/10) = Math.round(10.5) = 11 (rounds toward positive infinity)
      expect(alignTickToSpacing(105, 10)).toBe(110);
      expect(alignTickToSpacing(1005, 100)).toBe(1000);
      expect(alignTickToSpacing(1050, 100)).toBe(1100);
    });

    it("should handle edge cases", () => {
      expect(alignTickToSpacing(0, 1)).toBe(0);
      expect(alignTickToSpacing(5, 1)).toBe(5);
      expect(alignTickToSpacing(-5, 1)).toBe(-5);
    });

    it("should round down when roundUp is false", () => {
      expect(alignTickToSpacing(121, 60, false)).toBe(120);
      expect(alignTickToSpacing(179, 60, false)).toBe(120);
      expect(alignTickToSpacing(120, 60, false)).toBe(120);
      expect(alignTickToSpacing(-61, 60, false)).toBe(-120);
    });

    it("should round up when roundUp is true", () => {
      expect(alignTickToSpacing(121, 60, true)).toBe(180);
      expect(alignTickToSpacing(179, 60, true)).toBe(180);
      expect(alignTickToSpacing(120, 60, true)).toBe(120);
      expect(alignTickToSpacing(-119, 60, true)).toBe(-60);
    });

    it("should keep lower < upper with directional rounding for close ticks", () => {
      const tickSpacing = 60;
      // ticks within the same spacing interval
      const lowerRaw = 61;
      const upperRaw = 119;
      const lower = alignTickToSpacing(lowerRaw, tickSpacing, false);
      const upper = alignTickToSpacing(upperRaw, tickSpacing, true);
      expect(lower).toBe(60);
      expect(upper).toBe(120);
      expect(lower).toBeLessThan(upper);
    });
  });

  describe("extractTickIndex", () => {
    it("should extract tick from nested object structure", () => {
      const tickIndex = {
        fields: { bits: 12000 },
        type: "some_type",
      };
      expect(extractTickIndex(tickIndex, "test_obj", "test_field")).toBe(12000);
    });

    it("should extract tick from direct number", () => {
      expect(extractTickIndex(12000, "test_obj", "test_field")).toBe(12000);
    });

    it("should extract tick from string", () => {
      expect(extractTickIndex("12000", "test_obj", "test_field")).toBe(12000);
    });

    it("should handle negative ticks in nested structure", () => {
      const tickIndex = {
        fields: { bits: -12000 },
        type: "some_type",
      };
      expect(extractTickIndex(tickIndex, "test_obj", "test_field")).toBe(-12000);
    });

    it("should throw on invalid structure", () => {
      expect(() => extractTickIndex(undefined, "test_obj", "test_field")).toThrow();
      expect(() => extractTickIndex({} as any, "test_obj", "test_field")).toThrow();
    });
  });

  describe("clampTickToRange", () => {
    const MIN_TICK = -443636;
    const MAX_TICK = 443636;

    it("should return tick unchanged when within range", () => {
      expect(clampTickToRange(120, 60, MIN_TICK, MAX_TICK)).toBe(120);
      expect(clampTickToRange(0, 60, MIN_TICK, MAX_TICK)).toBe(0);
      expect(clampTickToRange(-120, 60, MIN_TICK, MAX_TICK)).toBe(-120);
    });

    it("should clamp tick to aligned minimum when below range", () => {
      const tickSpacing = 60;
      const alignedMin = Math.ceil(MIN_TICK / tickSpacing) * tickSpacing;
      expect(clampTickToRange(-999999, tickSpacing, MIN_TICK, MAX_TICK)).toBe(alignedMin);
    });

    it("should clamp tick to aligned maximum when above range", () => {
      const tickSpacing = 60;
      const alignedMax = Math.floor(MAX_TICK / tickSpacing) * tickSpacing;
      expect(clampTickToRange(999999, tickSpacing, MIN_TICK, MAX_TICK)).toBe(alignedMax);
    });

    it("should ensure clamped ticks are aligned to spacing", () => {
      const tickSpacing = 60;
      const result = clampTickToRange(-999999, tickSpacing, MIN_TICK, MAX_TICK);
      expect(Math.abs(result % tickSpacing)).toBe(0);
      expect(result).toBeGreaterThanOrEqual(MIN_TICK);
    });

    it("should allow construction of valid tick range after clamping", () => {
      const tickSpacing = 60;
      // Simulate a scenario where raw ticks are inverted
      let tickLower = clampTickToRange(
        alignTickToSpacing(500000, tickSpacing, false),
        tickSpacing, MIN_TICK, MAX_TICK
      );
      let tickUpper = clampTickToRange(
        alignTickToSpacing(-500000, tickSpacing, true),
        tickSpacing, MIN_TICK, MAX_TICK
      );
      // After clamping, lower might be >= upper, so apply safety check
      if (tickLower >= tickUpper) {
        tickUpper = tickLower + tickSpacing;
      }
      expect(tickLower).toBeLessThan(tickUpper);
      expect(tickLower % tickSpacing).toBe(0);
      expect(tickUpper % tickSpacing).toBe(0);
    });
  });
});
