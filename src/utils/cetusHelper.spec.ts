import { alignTickToSpacing, extractTickIndex } from "./cetusHelper";

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
      expect(alignTickToSpacing(-150, 60)).toBe(-120); // Math.round(-2.5) = -2
      expect(alignTickToSpacing(-151, 60)).toBe(-180);
    });

    it("should work with different tick spacings", () => {
      expect(alignTickToSpacing(101, 10)).toBe(100);
      expect(alignTickToSpacing(105, 10)).toBe(110);
      expect(alignTickToSpacing(1005, 100)).toBe(1000);
      expect(alignTickToSpacing(1050, 100)).toBe(1100);
    });

    it("should handle edge cases", () => {
      expect(alignTickToSpacing(0, 1)).toBe(0);
      expect(alignTickToSpacing(5, 1)).toBe(5);
      expect(alignTickToSpacing(-5, 1)).toBe(-5);
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
});
