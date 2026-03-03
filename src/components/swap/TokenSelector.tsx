import { useState, useMemo, forwardRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSwapTokens } from "@/hooks/useSwapTokens";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useWallet } from "@/contexts/WalletContext";
import { type SwapToken, getTokenLogoUrl } from "@/lib/swapApi";

interface TokenSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (token: SwapToken) => void;
  selectedToken?: SwapToken | null;
}

export const TokenSelector = forwardRef<HTMLDivElement, TokenSelectorProps>(
  function TokenSelector({ open, onClose, onSelect, selectedToken }, _ref) {
    const { filteredTokens, popularTokens, tokens, isLoading, search, setSearch } = useSwapTokens();
    const { accountName } = useWallet();
    // Only fetch balances when selector is open
    const balances = useTokenBalances(accountName, tokens, open);
    const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

    const tokenKey = (t: SwapToken) => `${t.ticker}_${t.contract}`;

    const sortedFilteredTokens = useMemo(() => {
      return [...filteredTokens].sort((a, b) => {
        const balA = parseFloat(balances.get(tokenKey(a)) ?? "0");
        const balB = parseFloat(balances.get(tokenKey(b)) ?? "0");
        if (balA > 0 && balB <= 0) return -1;
        if (balB > 0 && balA <= 0) return 1;
        return 0;
      });
    }, [filteredTokens, balances]);

    const handleSelect = (token: SwapToken) => {
      onSelect(token);
      onClose();
      setSearch("");
    };

    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Select Token</DialogTitle>
            <DialogDescription className="sr-only">Search and select a token to swap</DialogDescription>
          </DialogHeader>

          <Input
            placeholder="Search by name or contract..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-panel border-border"
            autoFocus
          />

          {/* Popular tokens */}
          {!search && popularTokens.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {popularTokens.map((t) => (
                <button
                  key={tokenKey(t)}
                  onClick={() => handleSelect(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedToken && tokenKey(selectedToken) === tokenKey(t)
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-secondary hover:bg-secondary/80 text-foreground"
                  }`}
                >
                  <TokenLogo token={t} imgErrors={imgErrors} setImgErrors={setImgErrors} size={18} />
                  {t.ticker}
                </button>
              ))}
            </div>
          )}

          <ScrollArea className="h-[300px] -mx-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Loading tokens...
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                No tokens found
              </div>
            ) : (
              <div className="space-y-0.5 px-2">
                {sortedFilteredTokens.map((t) => {
                  const isSelected = selectedToken && tokenKey(selectedToken) === tokenKey(t);
                  const bal = balances.get(tokenKey(t));
                  const numBal = parseFloat(bal ?? "0");
                  return (
                    <button
                      key={tokenKey(t)}
                      onClick={() => handleSelect(t)}
                      disabled={!!isSelected}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-primary/10 cursor-default"
                          : "hover:bg-panel-hover"
                      }`}
                    >
                      <TokenLogo token={t} imgErrors={imgErrors} setImgErrors={setImgErrors} size={32} />
                      <div className="text-left flex-1">
                        <div className="font-semibold text-sm">{t.ticker}</div>
                        <div className="text-xs text-muted-foreground">{t.contract}</div>
                      </div>
                      {accountName && numBal > 0 && (
                        <span className="text-sm font-mono text-muted-foreground">
                          {numBal.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }
);

function TokenLogo({
  token,
  imgErrors,
  setImgErrors,
  size,
}: {
  token: SwapToken;
  imgErrors: Set<string>;
  setImgErrors: React.Dispatch<React.SetStateAction<Set<string>>>;
  size: number;
}) {
  const key = `${token.ticker}_${token.contract}`;
  const hasError = imgErrors.has(key);

  return hasError ? (
    <div
      className="rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0"
      style={{ width: size, height: size }}
    >
      {token.ticker.charAt(0)}
    </div>
  ) : (
    <img
      src={getTokenLogoUrl(token.contract, token.ticker)}
      alt={token.ticker}
      className="rounded-full shrink-0"
      style={{ width: size, height: size }}
      onError={() => setImgErrors((prev) => new Set(prev).add(key))}
    />
  );
}
