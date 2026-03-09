

# Migrate CHEESESwap from WaxOnEdge to Alcor Exchange API

## Why
WaxOnEdge (rates.neftyblocks.com / woe-api.neftyblocks.com) is shutting down. Alcor Exchange has a full API that provides token lists, route calculation, and swap execution on WAX.

## Alcor API Endpoints (WAX)

- **Token list**: `GET https://wax.alcor.exchange/api/v2/tokens` → `[{contract, decimals, symbol, id}]`
- **Token logo**: `GET https://wax.alcor.exchange/api/v2/tokens/<symbol>-<contract>/logo` (PNG)
- **Route calc**: `GET https://wax.alcor.exchange/api/v2/swapRouter/getRoute?trade_type=EXACT_INPUT&input=wax-eosio.token&output=cheese-cheeseburger&amount=1.00000000&slippage=0.30&receiver=<account>&maxHops=2`
  - Returns: `{memo, output, minReceived, priceImpact, route: [poolIds], executionPrice}`
- **Swap execution**: Transfer input token to `swap.alcor` with the `memo` from getRoute response
- **Token price**: `GET https://wax.alcor.exchange/api/v2/tokens/<id>` → `{system_price, usd_price}`

## Changes

### 1. Rewrite `src/lib/swapApi.ts`
- Replace `WOE_API` and `RATES_API` constants with `ALCOR_API = "https://wax.alcor.exchange/api/v2"`
- **`fetchSwapTokenList`**: Hit `/tokens`, map `{contract, decimals, symbol, id}` to our `SwapToken` interface (rename `decimals→precision`, `symbol→ticker`)
- **`getTokenLogoUrl`**: Use `https://wax.alcor.exchange/api/v2/tokens/${symbol.toLowerCase()}-${contract}/logo`
- **`fetchSwapRoute`**: Hit `/swapRouter/getRoute` with params `{trade_type: "EXACT_INPUT", input: "ticker-contract", output: "ticker-contract", amount, slippage, receiver, maxHops: 3}`. Map response to updated `SwapRoute` interface
- **`normalizeRouteActions`**: Change to build a single transfer action to `swap.alcor` using the `memo` from the route response. The action sends the input token to `swap.alcor` with that memo
- **`fetchTokenWaxPrice`**: Hit `/tokens/<id>` and return `system_price`
- Update `SwapRoute` interface to match Alcor's response shape: `{output, minReceived, priceImpact, memo, route: number[], executionPrice}`

### 2. Update `src/hooks/useSwapRoute.ts`
- Minor: the hook itself stays the same structurally, just consumes the new `SwapRoute` shape
- Update references from `amount_received` → `output`, `minimum_received` → `minReceived`

### 3. Update `src/components/swap/CheeseSwapWidget.tsx`
- Update field references: `route.amount_received` → `route.output`, `route.minimum_received` → `route.minReceived`
- `normalizeRouteActions` now returns a single transfer action (token contract → swap.alcor with memo)

### 4. Update `src/hooks/useSwapTokens.ts`
- No structural change needed — it calls `fetchSwapTokenList` which will return the same `SwapToken` shape

### 5. Token logo in `TokenSelector`
- `getTokenLogoUrl` already used everywhere — the new URL will propagate automatically

## Swap Execution Flow (Alcor)
```text
1. User picks tokens + amount
2. GET /swapRouter/getRoute → {memo, output, minReceived, priceImpact}
3. User clicks Swap
4. Build action: transfer input token to "swap.alcor" with memo from step 2
   {
     account: inputTokenContract,  // e.g. "eosio.token"
     name: "transfer",
     data: { from: user, to: "swap.alcor", quantity: "1.00000000 WAX", memo }
   }
5. Sign + broadcast via Wharf
```

## What stays the same
- Wallet connection (Wharf/WCW)
- Token balance fetching (RPC/Hyperion)
- UI components (SwapTokenInput, TokenSelector, CheeseSwapWidget layout)
- Slippage persistence, popular tokens, preferred contracts

