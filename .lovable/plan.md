
Goal: stabilize the swap widget by fixing three linked issues:
1) route lookup always failing,
2) token selector not opening/responding reliably,
3) page freezing/crashing while typing amount.

What I found:
- The route API contract in the current code does not match the real WaxOnEdge endpoint behavior.
  - Current code sends `token_in`, `token_out`, `amount_in`, `slippage`, `receiver`, `split_max_routes`, `chain`.
  - The endpoint also expects `filter_exchange` and `filter_type` (can be empty strings). Without them, it returns `Missing params!`.
  - The endpoint returns an array of routes (first route is best), not a single object.
- The current `SwapRoute` type expects fields like `amount_out`, `fee`, `routes[]`, and `actions` in Wharf format, but actual response uses fields like `amount_received`, `fees`, and `actions` as `{to, quantity, memo}`.
- Performance issue: token balances are fetched too aggressively for the entire token list, creating heavy request pressure and UI jank. This is likely why token click appears unresponsive/freezes.
- There is also a dev warning around refs from `TokenSelector`, and the selector architecture can be simplified to avoid unnecessary duplicated dialog/render work.

Implementation plan:

1) Fix route request parameters and response parsing
- File: `src/lib/swapApi.ts`
- Update `fetchSwapRoute` to:
  - Include `filter_exchange: ""` and `filter_type: ""` in query params.
  - Keep required existing params.
  - Parse response as array and return first route or `null` when empty.
- Replace/extend `SwapRoute` typing to match real API payload shape (at least fields used in UI and swap execution).
- Improve error handling:
  - If response body is plain text (`Missing params!`) or malformed, throw a descriptive error that UI can show.

2) Normalize route actions before transaction signing
- Files: `src/lib/swapApi.ts`, `src/components/swap/CheeseSwapWidget.tsx` (or shared helper)
- Add action normalizer:
  - From API action `{to, quantity, memo}`
  - To Wharf/session action:
    - `account: to`
    - `name: "transfer"`
    - `authorization: [{ actor: accountName, permission: "active" }]` (or wallet permission if available)
    - `data: { from: accountName, to, quantity, memo }`
- Use normalized actions in `handleSwap`.
- Validate `route` before enabling swap button (must have non-empty actions and output amount).

3) Update UI to use actual route fields
- File: `src/components/swap/CheeseSwapWidget.tsx`
- Replace usage of non-existent fields:
  - `amount_out` -> `amount_received` (or mapped output field).
  - `fee` -> `fees`/`platform_fees` as appropriate.
  - `routes` rendering: guard for absence (API may not provide hop breakdown list in same shape).
- Keep route details robust with optional rendering so UI never crashes on missing optional fields.
- Improve `routeError` messaging:
  - Show API text when available instead of generic “Unable to find route”.

4) Fix selector responsiveness and remove heavy balance flood
- Files: `src/components/swap/CheeseSwapWidget.tsx`, `src/components/swap/TokenSelector.tsx`, `src/hooks/useTokenBalances.ts`
- Use a single `TokenSelector` instance (switch behavior by active side: in/out), rather than two mounted dialogs.
- Make `useTokenBalances` lazy:
  - Only fetch when selector is open.
  - Fetch a bounded subset first (popular + selected + currently filtered visible items), not all tokens immediately.
  - Optionally progressively fetch more while idle.
- Keep selected-token balances in `CheeseSwapWidget` via `useTokenBalance` for “You pay/You receive” panels.
- This will eliminate the freeze and make clicks open selector immediately.

5) Make default pair deterministic to avoid bad ticker collisions
- File: `src/components/swap/CheeseSwapWidget.tsx`
- Token selection currently matches by ticker only (can pick wrong contract if duplicates exist).
- Add preferred contract matching:
  - WAX -> `eosio.token`
  - CHEESE -> `cheeseburger`
  - fallback to ticker match if exact pair not found.
- This avoids selecting an unintended token contract and reduces “no route” cases.

6) Address ref warning cleanly
- File: `src/components/swap/TokenSelector.tsx` (+ possibly any wrapper components involved)
- Ensure no function component is used where a ref is expected by Radix primitives.
- If needed, wrap any custom component that receives forwarded refs with `React.forwardRef`.
- Confirm warning disappears from console after route/selector refactor.

Validation checklist (end-to-end):
1. Connect with Anchor and Cloud Wallet.
2. Click input token and output token buttons — selector opens instantly both times.
3. Confirm balances are visible:
   - in selected token panels,
   - and inside selector list rows.
4. Enter `1` WAX -> CHEESE:
   - quote loads,
   - no “Missing params” error,
   - output updates and route details render without crash.
5. Try typing quickly (`0.1`, `1`, `1.5`) and verify no freeze/jank.
6. Execute a small swap and confirm transaction signs successfully.

Technical notes:
- Main correctness blocker is API contract mismatch in `fetchSwapRoute`.
- Main stability blocker is over-fetching balances in selector path.
- After these are fixed, the remaining UI/selector behavior should become reliable and responsive.
