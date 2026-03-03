import { useQuery } from "@tanstack/react-query";
import { fetchTokenBalance, type SwapToken } from "@/lib/swapApi";

export function useTokenBalances(
  accountName: string | null,
  tokens: SwapToken[]
) {
  const { data: balances } = useQuery({
    queryKey: ["token-balances", accountName, tokens.length],
    queryFn: async () => {
      const map = new Map<string, string>();
      // Fetch in batches of 10 to avoid overwhelming the RPC
      const batchSize = 10;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batch = tokens.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map((t) => fetchTokenBalance(accountName!, t.contract, t.ticker))
        );
        batch.forEach((t, idx) => {
          map.set(`${t.ticker}_${t.contract}`, results[idx]);
        });
      }
      return map;
    },
    enabled: !!accountName && tokens.length > 0,
    staleTime: 15_000,
    gcTime: 60_000,
  });

  return balances ?? new Map<string, string>();
}
