

## Fix: "transfer" action not found on swap.we

### Problem
The `normalizeRouteActions` function incorrectly sets `account: a.to` (the DEX router, e.g. `swap.we`). On WAX/EOSIO, `transfer` is an action on the **token contract** (e.g. `eosio.token`), not the DEX. The DEX address goes in `data.to`.

No smart contract is needed -- this is purely a client-side mapping fix.

### The Fix

**File: `src/lib/swapApi.ts`** -- Update `normalizeRouteActions`:

The function needs to know which token contract to call `transfer` on. The quantity string contains the ticker (e.g. `"1.00000000 WAX"`), and we need to resolve that to the input token's contract.

The simplest approach: pass `tokenIn` (the input token) into the normalizer. For single-hop swaps (which is the common case from this API), the first action always transfers the input token. For multi-hop, each action's quantity contains the token symbol which can be matched.

Since the API currently returns single-action routes where the user sends their input token to the router, we can use the input token's contract directly:

```typescript
export function normalizeRouteActions(
  route: SwapRoute,
  accountName: string,
  inputTokenContract: string  // e.g. "eosio.token"
): SwapAction[] {
  return route.actions.map((a) => ({
    account: inputTokenContract,  // transfer lives on token contract
    name: "transfer",
    authorization: [{ actor: accountName, permission: "active" }],
    data: {
      from: accountName,
      to: a.to,           // send tokens TO the DEX router
      quantity: a.quantity,
      memo: a.memo,
    },
  }));
}
```

**File: `src/components/swap/CheeseSwapWidget.tsx`** -- Update the `handleSwap` call:

Pass `tokenIn.contract` to `normalizeRouteActions`:

```typescript
const actions = normalizeRouteActions(route, accountName, tokenIn!.contract);
```

### Why This Works
On EOSIO chains, token transfers always call the `transfer` action on the token's own contract (`eosio.token`, `cheeseburger`, etc.), with the recipient in the `to` data field. The DEX router (`swap.we`) receives the tokens and reads the `memo` to know how to route the swap.

### Technical Notes
- No smart contract deployment needed
- Two files changed, ~3 lines modified total
- The API response structure `{to, quantity, memo}` already contains all needed data -- just the contract target was wrong
