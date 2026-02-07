export interface PriceProvider {
  getPrice(token: string): Promise<number | null>;
}
