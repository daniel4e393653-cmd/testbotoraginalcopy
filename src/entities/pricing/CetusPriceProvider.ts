import { PriceProvider } from "./PriceProvider";
import { FetchProviderConnector } from "../connector";

interface GeckoTerminalPoolResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      base_token_price_usd: string;
      quote_token_price_usd: string;
      base_token_price_native_currency: string;
      quote_token_price_native_currency: string;
      pool_created_at: string;
      address: string;
      name: string;
      fdv_usd: string;
      market_cap_usd: string;
      price_change_percentage: {
        h1: string;
        h24: string;
      };
      transactions: {
        h1: {
          buys: number;
          sells: number;
          buyers: number;
          sellers: number;
        };
        h24: {
          buys: number;
          sells: number;
          buyers: number;
          sellers: number;
        };
      };
      volume_usd: {
        h1: string;
        h24: string;
      };
      reserve_in_usd: string;
    };
    relationships: {
      base_token: {
        data: {
          id: string;
          type: string;
        };
      };
      quote_token: {
        data: {
          id: string;
          type: string;
        };
      };
      dex: {
        data: {
          id: string;
          type: string;
        };
      };
    };
  };
}

interface GeckoTerminalTokenResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      total_supply: string;
      coingecko_coin_id: string | null;
      price_usd: string;
      fdv_usd: string;
      total_reserve_in_usd: string;
      volume_usd: {
        h24: string;
      };
      market_cap_usd: string | null;
    };
  };
}

export class CetusPriceProvider implements PriceProvider {
  private baseURL = "https://api.geckoterminal.com/api/v2";
  private connector = new FetchProviderConnector();

  async getPrice(token: string): Promise<number> {
    try {
      // Normalize the token address for GeckoTerminal
      // GeckoTerminal uses the full coin type but expects it without 0x prefix and lowercase
      const normalizedAddress = token.toLowerCase().replace(/^0x/, '');
      
      // Try to get token info from GeckoTerminal
      const tokenResponse = await this.connector.get<GeckoTerminalTokenResponse>(
        `${this.baseURL}/networks/sui/tokens/${normalizedAddress}`,
        {}
      );

      if (tokenResponse?.data?.attributes?.price_usd) {
        const price = parseFloat(tokenResponse.data.attributes.price_usd);
        if (price > 0) {
          return price;
        }
      }

      return null;
    } catch (error) {
      // If token not found or API error, return null
      return null;
    }
  }
}
