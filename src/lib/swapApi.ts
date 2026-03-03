// WaxOnEdge + Alcor API layer for CHEESESwap
import { waxRpcCall } from "./waxRpcFallback";

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

// Shape returned by the rates API
export interface RawRouteAction {
  to: string;
  quantity: string;
  memo: string;
}

export interface SwapRoute {
  amount_received: number;
  minimum_received: number;
  price_impact: number;
  fees: number;
  platform_fees: number;
  actions: RawRouteAction[];
  type: string;
}

const WOE_API = "https://woe-api.neftyblocks.com";
const RATES_API = "https://rates.neftyblocks.com/api/swap";

export function getTokenLogoUrl(contract: string, ticker: string): string {
  return `https://raw.githubusercontent.com/alcorexchange/alcor-ui/master/assets/tokens/wax/${ticker.toLowerCase()}_${contract}.png`;
}

export async function fetchSwapTokenList(signal?: AbortSignal): Promise<SwapToken[]> {
  const res = await fetch(`${WOE_API}/tokens?chain=wax&limit=200`, { signal });
  if (!res.ok) throw new Error("Failed to fetch token list");
  const data = await res.json();
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
): Promise<SwapRoute | null> {
  const formattedAmount = formatTokenAmount(amountIn, tokenIn.precision);

  const params = new URLSearchParams({
    token_in: `${tokenIn.ticker}_${tokenIn.contract}`,
    token_out: `${tokenOut.ticker}_${tokenOut.contract}`,
    amount_in: formattedAmount,
    slippage: slippage.toString(),
    receiver,
    split_max_routes: "3",
    chain: "wax",
    filter_exchange: "",
    filter_type: "",
  });

  const res = await fetch(`${RATES_API}/routes?${params}`, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to fetch swap route");
  }

  const text = await res.text();
  // API may return plain text error like "Missing params!"
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || "Invalid route response");
  }

  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0] as SwapRoute;
}

/** Convert raw API actions to Wharf transaction actions */
export function normalizeRouteActions(
  route: SwapRoute,
  accountName: string,
  inputTokenContract: string
): SwapAction[] {
  return route.actions.map((a) => ({
    account: inputTokenContract,
    name: "transfer",
    authorization: [{ actor: accountName, permission: "active" }],
    data: {
      from: accountName,
      to: a.to,
      quantity: a.quantity,
      memo: a.memo,
    },
  }));
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
  try {
    const data = await waxRpcCall<string[]>(
      '/v1/chain/get_currency_balance',
      { code: contract, account, symbol: ticker }
    );
    if (!data || data.length === 0) return "0";
    return data[0].split(" ")[0];
  } catch {
    return "0";
  }
}

// Preferred contracts for deterministic default pair selection
export const PREFERRED_CONTRACTS: Record<string, string> = {
  WAX: "eosio.token",
  CHEESE: "cheeseburger",
};

// Popular tokens pinned at top of selector
export const POPULAR_TICKERS = ["WAX", "CHEESE", "LSWAX", "TLM", "WAXUSDC"];
