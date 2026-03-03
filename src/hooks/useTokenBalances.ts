import { useQuery } from "@tanstack/react-query";
import { fetchAllTokenBalances, fetchSingleTokenBalance } from "@/lib/waxRpcFallback";
import { type SwapToken, POPULAR_TICKERS } from "@/lib/swapApi";

/**
 * Fetches all token balances via Hyperion (1 request) instead of 200+ individual RPC calls.
 * Falls back to RPC for popular tokens if Hyperion data is stale.
 */
export function useTokenBalances(
  accountName: string | null,
  tokens: SwapToken[],
  enabled: boolean = true
) {
  const { data: balances } = useQuery({
    queryKey: ["token-balances", accountName],
    queryFn: async () => {
      const map = new Map<string, string>();

      try {
        const result = await fetchAllTokenBalances(accountName!);

        for (const t of result.tokens) {
          map.set(`${t.symbol}_${t.contract}`, String(t.amount));
        }

        // If Hyperion is stale, supplement with RPC for popular tokens
        if (result.isStale) {
          const popular = tokens.filter((t) => POPULAR_TICKERS.includes(t.ticker));
          const rpcResults = await Promise.all(
            popular.map((t) =>
              fetchSingleTokenBalance(accountName!, t.contract, t.ticker)
            )
          );
          popular.forEach((t, idx) => {
            if (rpcResults[idx] > 0) {
              map.set(`${t.ticker}_${t.contract}`, String(rpcResults[idx]));
            }
          });
        }
      } catch (err) {
        console.warn("[useTokenBalances] Hyperion failed, falling back to RPC for popular tokens", err);
        const popular = tokens.filter((t) => POPULAR_TICKERS.includes(t.ticker));
        const rpcResults = await Promise.all(
          popular.map((t) =>
            fetchSingleTokenBalance(accountName!, t.contract, t.ticker)
          )
        );
        popular.forEach((t, idx) => {
          if (rpcResults[idx] > 0) {
            map.set(`${t.ticker}_${t.contract}`, String(rpcResults[idx]));
          }
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
