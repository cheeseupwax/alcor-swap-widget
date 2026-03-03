// WaxOnEdge + Alcor API layer for CHEESESwap

export interface SwapToken {
  contract: string;
  ticker: string;
  precision: number;
  logo?: string;
}

export interface SwapAction {
  account: string;
  name: string;
  authorization: Array<{ actor: string; permission: string }>;
  data: Record<string, unknown>;
}

export interface SwapRoute {
  actions: SwapAction[];
  amount_out: string;
  price_impact: number;
  fee: number;
  routes: Array<{
    exchange: string;
    pool: string;
    token_in: string;
    token_out: string;
    amount_in: string;
    amount_out: string;
  }>;
}

const WOE_API = "https://woe-api.neftyblocks.com";
const RATES_API = "https://rates.neftyblocks.com/api/swap";

export function getTokenLogoUrl(contract: string, ticker: string): string {
  return `https://raw.githubusercontent.com/aspect-build/wax-token-logos/refs/heads/master/logos/${ticker.toLowerCase()}_${contract}.png`;
}

export async function fetchSwapTokenList(signal?: AbortSignal): Promise<SwapToken[]> {
  const res = await fetch(`${WOE_API}/tokens?chain=wax&limit=200`, { signal });
  if (!res.ok) throw new Error("Failed to fetch token list");
  const data = await res.json();
  // API returns { contract, symbol: { ticker, precision }, ... }
  const seen = new Set<string>();
  return (data as Array<{ contract: string; symbol: { ticker: string; precision: number } }>)
    .filter((t) => {
      const key = `${t.symbol.ticker}_${t.contract}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((t) => ({
      contract: t.contract,
      ticker: t.symbol.ticker,
      precision: t.symbol.precision,
      logo: getTokenLogoUrl(t.contract, t.symbol.ticker),
    }));
}

export async function fetchSwapRoute(
  tokenIn: SwapToken,
  tokenOut: SwapToken,
  amountIn: string,
  slippage: number,
  receiver: string,
  signal?: AbortSignal
): Promise<SwapRoute> {
  // API requires amount_in with full decimal precision
  const formattedAmount = formatTokenAmount(amountIn, tokenIn.precision);

  const params = new URLSearchParams({
    token_in: `${tokenIn.ticker}_${tokenIn.contract}`,
    token_out: `${tokenOut.ticker}_${tokenOut.contract}`,
    amount_in: formattedAmount,
    slippage: slippage.toString(),
    receiver,
    split_max_routes: "3",
    chain: "wax",
  });

  const res = await fetch(`${RATES_API}/routes?${params}`, { signal });
  if (!res.ok) throw new Error("Failed to fetch swap route");
  return res.json();
}

export async function fetchTokenWaxPrice(
  contract: string,
  ticker: string,
  signal?: AbortSignal
): Promise<number> {
  const res = await fetch(`${WOE_API}/wax_price/${contract}/${ticker}`, { signal });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.wax_price ?? 0;
}

export function formatTokenAmount(amount: number | string, precision: number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";
  return num.toFixed(precision);
}

export async function fetchTokenBalance(
  account: string,
  contract: string,
  ticker: string
): Promise<string> {
  const res = await fetch("https://wax.greymass.com/v1/chain/get_currency_balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: contract, account, symbol: ticker }),
  });
  if (!res.ok) return "0";
  const data: string[] = await res.json();
  if (!data || data.length === 0) return "0";
  // Response: ["123.45670000 WAX"] — extract numeric part
  return data[0].split(" ")[0];
}

// Popular tokens pinned at top of selector
export const POPULAR_TICKERS = ["WAX", "CHEESE", "LSWAX", "TLM", "WAXUSDC"];
