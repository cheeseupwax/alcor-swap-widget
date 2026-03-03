

## Fix: Swap Route and Token Balances

### Problem 1: "Unable to find route" (500 error)
The WaxOnEdge routing API expects `amount_in` to include the token's decimal precision (e.g., `1.00000000` for WAX with 8 decimals). Currently we send just `1`, which causes a "Missing params!" error.

### Problem 2: No token balances visible
There is no balance fetching implemented. Balances should appear:
- In the **token selector dialog** next to each token
- In the **swap input panels** ("You pay" / "You receive") when a token is selected

---

### Changes

#### 1. Fix `fetchSwapRoute` in `src/lib/swapApi.ts`
- Format `amount_in` with the token's precision before sending to the API (e.g., `"1.00000000"` instead of `"1"`)
- Add a `fetchTokenBalance` function that calls the WAX RPC endpoint `POST https://wax.greymass.com/v1/chain/get_currency_balance` with `{ code: contract, account: accountName, symbol: ticker }` -- returns an array like `["123.45670000 WAX"]`

#### 2. Create `src/hooks/useTokenBalance.ts`
- A React Query hook that fetches the balance for a single token given `accountName`, `contract`, and `ticker`
- Returns the numeric balance string
- Enabled only when wallet is connected
- Short stale time (~15s) for reasonably fresh balances

#### 3. Create `src/hooks/useTokenBalances.ts`
- A hook that batch-fetches balances for all tokens in the token list (or a subset) when wallet is connected
- Returns a `Map<string, string>` keyed by `ticker_contract` for quick lookup
- Used by the TokenSelector to show balances next to each token

#### 4. Update `src/components/swap/CheeseSwapWidget.tsx`
- Fetch balances for `tokenIn` and `tokenOut` using `useTokenBalance`
- Pass `balance` prop to both `SwapTokenInput` components -- this enables the balance display and the 25/50/75/Max percent buttons on the "You pay" panel

#### 5. Update `src/components/swap/TokenSelector.tsx`
- Accept `accountName` prop (or use `useWallet` directly)
- Fetch balances for all tokens using `useTokenBalances`
- Display balance next to each token row, right-aligned
- Sort tokens with non-zero balances to the top (after popular tokens section)

### Technical Details

- WAX RPC endpoint: `POST https://wax.greymass.com/v1/chain/get_currency_balance`
- Request body: `{ code: "eosio.token", account: "fragglerockk", symbol: "WAX" }`
- Response: `["123.45670000 WAX"]` (array of asset strings) -- parse numeric part
- The `amount_in` fix formats using the existing `formatTokenAmount` helper with the input token's precision

