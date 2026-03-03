

## Use CHEESEHub's RPC Fallback and API Settings

### Overview
Port the proven RPC fallback infrastructure, Hyperion balance fetching, and WharfKit configuration from your [CHEESEHub](/projects/f600f253-304d-4d14-bbfc-83234df294dc) project into this swap project. This replaces the current single-endpoint setup (wax.greymass.com) that causes 500 errors and RPC flooding.

### Changes

#### 1. Create `src/lib/waxRpcFallback.ts` (new file)
Copy from CHEESEHub. Provides:
- `WAX_RPC_ENDPOINTS` array: eosphere, waxsweden, pink.gg, eosusa, alohaeos (greymass removed due to CORS issues)
- `HYPERION_ENDPOINTS` array for batch balance queries
- `waxRpcCall()` -- generic RPC with automatic fallback across endpoints, 8s timeout per endpoint
- `fetchAllTokenBalances()` -- single Hyperion call (`/v2/state/get_tokens`) returns ALL balances for an account in one request (instead of 200+ individual calls)
- `fetchSingleTokenBalance()` -- RPC fallback for individual token balance
- `fetchTableRows()` -- table query with fallback

#### 2. Create `src/lib/waxConfig.ts` (new file)
Copy from CHEESEHub. Central WAX chain configuration:
- `WAX_CHAIN` with chain ID and RPC URL list
- `CHEESE_CONFIG` with token contract details

#### 3. Update `src/lib/swapApi.ts`
- Replace `fetchTokenBalance()` to use `waxRpcCall` from the new fallback module instead of hardcoded `wax.greymass.com`
- Keep the swap-specific API functions (fetchSwapTokenList, fetchSwapRoute, normalizeRouteActions) unchanged

#### 4. Rewrite `src/hooks/useTokenBalances.ts`
Replace the current approach (200+ individual RPC calls) with Hyperion:
- Call `fetchAllTokenBalances(account)` -- one HTTP request returns all balances
- Build the balance Map from the Hyperion response
- If Hyperion reports stale data, fall back to RPC for popular tokens only
- Only fetch when selector is open (`enabled` flag)

#### 5. Update `src/contexts/WalletContext.tsx`
- Use `wax.eosphere.io` as primary RPC (matching CHEESEHub) instead of `wax.greymass.com`
- Keep the same SessionKit/WharfKit setup

#### 6. Fix `src/components/swap/TokenSelector.tsx`
- Add missing `DialogDescription` (fixes the console warning)

### Why This Fixes the Issues
- **RPC flooding eliminated**: Hyperion returns all balances in 1 request instead of 200+
- **No more 500 errors**: If one endpoint fails, automatically tries the next
- **Token selector responsive**: No heavy RPC load blocking the UI thread
- **greymass.com removed**: Known to have CORS and rate-limiting issues in browser contexts

### Technical Notes
- The `posthog` and `osano` errors in your console are from an ad blocker -- harmless and unrelated
- `wax.greymass.com` is still used for Greymass Fuel (free CPU/NET for Anchor users) but not for general RPC calls
- Hyperion staleness detection (5-minute threshold) ensures balance accuracy

