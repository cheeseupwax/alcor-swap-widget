
Goal: make the token selector open reliably/instantly again, restore route fetching, and separate harmless adblock noise from real errors.

What I found
1) The selector open path is currently fragile:
- `TokenSelector` is wrapped in `forwardRef` but the forwarded ref is never used.
- Console shows `Function components cannot be given refs... Check the render method of DialogContent`.
- This warning appears exactly when opening the selector, which can cause Dialog focus/open behavior to fail or close immediately.

2) Route lookup is not consistently firing:
- In your captured network, I see token list + balance RPC calls, but no `rates.neftyblocks.com/api/swap/routes` request during the failing snapshot.
- That means the route query is often not enabled (state mismatch) rather than “API is down”.

3) Adblock messages are expected noise:
- `posthog` / `osano` `ERR_BLOCKED_BY_CLIENT` are from browser extensions, not your swap app.
- They can be ignored unless you specifically need those analytics scripts.

Implementation plan (in order)
1) Stabilize TokenSelector component
- File: `src/components/swap/TokenSelector.tsx`
- Convert `TokenSelector` from `forwardRef(...)` to a plain function component.
- Keep `DialogDescription` (already good).
- Add a deterministic open behavior:
  - preserve controlled `open` prop
  - avoid immediate close loops from focus timing by handling open/close explicitly
  - keep deferred balance fetch, but only after modal is visibly mounted.

2) Make selector open fast regardless of balances
- File: `src/components/swap/TokenSelector.tsx`
- Do not gate rendering on balance fetch.
- Render token list immediately from cached token list.
- Keep balances as progressive enhancement (background update only).
- Add lightweight “syncing balances…” hint instead of blocking any UI.

3) Harden route query enable logic
- File: `src/hooks/useSwapRoute.ts`
- Require: tokenIn, tokenOut, amount>0, receiver, and tokenIn/tokenOut not identical.
- Keep debounce, but ensure query starts as soon as these conditions are true.
- Return explicit `noRoute` state when API returns `[]` (not an exception).

4) Fix swap button state messaging
- File: `src/components/swap/CheeseSwapWidget.tsx`
- Use `noRoute` from hook so button text and disabled state are consistent:
  - “No route available” only when true no-route/error
  - avoid showing enabled-looking state when `route` is undefined.
- Keep current transaction action mapping fix intact.

5) Keep console noise cleanly separated
- No code change required for Posthog/Osano blocks.
- Treat those as non-blocking and focus diagnostics on:
  - Dialog ref/focus warnings
  - missing `/routes` request
  - actual RPC/API failures.

Validation checklist after changes
1) Click either token button: selector opens immediately every time.
2) Type in search and pick token: modal closes and selection updates.
3) Enter amount: `/api/swap/routes` request appears and quote updates.
4) Swap button states:
- disconnected: Connect Wallet
- no amount: Enter amount
- fetching: Finding best route...
- no route: No route available
- valid route: Swap
5) Console should no longer show the Dialog ref warning.
