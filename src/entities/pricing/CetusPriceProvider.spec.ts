import { normalizeStructTag, SUI_TYPE_ARG } from "@mysten/sui/utils";
import { CetusPriceProvider } from "./CetusPriceProvider";

describe("#CetusPriceProvider", () => {
  const priceProvider = new CetusPriceProvider();

  it("should get price correctly", async () => {
    const suiPrice = await priceProvider.getPrice(
      normalizeStructTag(SUI_TYPE_ARG)
    );

    const usdcPrice = await priceProvider.getPrice(
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
    );

    expect(suiPrice).toBeGreaterThan(0);
    expect(usdcPrice).toBeGreaterThan(0);
  });
});
