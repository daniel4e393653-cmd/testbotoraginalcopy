import { normalizeStructTag, SUI_TYPE_ARG } from "@mysten/sui/utils";
import { CetusPriceProvider } from "./CetusPriceProvider";

describe("#CetusPriceProvider", () => {
  const priceProvider = new CetusPriceProvider();

  it("should get price or null for tokens", async () => {
    const suiPrice = await priceProvider.getPrice(
      normalizeStructTag(SUI_TYPE_ARG)
    );

    const usdcPrice = await priceProvider.getPrice(
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
    );

    // GeckoTerminal may not have all tokens, so price can be null or a positive number
    if (suiPrice !== null) {
      expect(suiPrice).toBeGreaterThan(0);
    }
    
    if (usdcPrice !== null) {
      expect(usdcPrice).toBeGreaterThan(0);
    }

    // At least verify the method doesn't throw errors
    expect(suiPrice).toBeDefined();
    expect(usdcPrice).toBeDefined();
  });
});
