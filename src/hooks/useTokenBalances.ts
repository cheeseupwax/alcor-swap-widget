import { useQuery } from "@tanstack/react-query";
import { fetchTokenBalance, type SwapToken, POPULAR_TICKERS } from "@/lib/swapApi";

/**
 * Lazy token balance fetcher — only fetches when enabled (selector open).
 * Fetches popular tokens first, then remainder in batches.
 */
export function useTokenBalances(
  accountName: string | null,
  tokens: SwapToken[],
  enabled: boolean = true
) {
  const { data: balances } = useQuery({
    queryKey: ["token-balances", accountName, tokens.length],
    queryFn: async () => {
      const map = new Map<string, string>();
      // Prioritize popular tokens first
      const popular = tokens.filter((t) => POPULAR_TICKERS.includes(t.ticker));
      const rest = tokens.filter((t) => !POPULAR_TICKERS.includes(t.ticker));
      const ordered = [...popular, ...rest];

      const batchSize = 10;
      for (let i = 0; i < ordered.length; i += batchSize) {
        const batch = ordered.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((t) => fetchTokenBalance(accountName!, t.contract, t.ticker))
        );
        batch.forEach((t, idx) => {
          map.set(`${t.ticker}_${t.contract}`, results[idx]);
        });
      }
      return map;
    },
    enabled: !!accountName && tokens.length > 0 && enabled,
    staleTime: 30_000,
    gcTime: 120_000,
  });

  return balances ?? new Map<string, string>();
}
