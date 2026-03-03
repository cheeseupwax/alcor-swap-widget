import { useState } from "react";
import { Input } from "@/components/ui/input";
import { type SwapToken, getTokenLogoUrl, formatTokenAmount } from "@/lib/swapApi";

interface SwapTokenInputProps {
  label: string;
  token: SwapToken | null;
  amount: string;
  onAmountChange?: (val: string) => void;
  onTokenClick: () => void;
  balance?: string;
  readOnly?: boolean;
  loading?: boolean;
}

const PERCENT_BUTTONS = [25, 50, 75, 100] as const;

export function SwapTokenInput({
  label,
  token,
  amount,
  onAmountChange,
  onTokenClick,
  balance,
  readOnly = false,
  loading = false,
}: SwapTokenInputProps) {
  const [imgError, setImgError] = useState(false);

  const handlePercentClick = (pct: number) => {
    if (!balance || !onAmountChange) return;
    const val = parseFloat(balance) * (pct / 100);
    onAmountChange(formatTokenAmount(val, token?.precision ?? 4));
  };

  return (
    <div className="rounded-xl bg-panel p-4 transition-colors hover:bg-panel-hover">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {balance && (
          <span className="text-xs text-muted-foreground">
            Balance:{" "}
            <span className="text-foreground font-mono">
              {parseFloat(balance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onTokenClick}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors shrink-0"
        >
          {token ? (
            <>
              <img
                src={imgError ? "/placeholder.svg" : getTokenLogoUrl(token.contract, token.ticker)}
                alt={token.ticker}
                className="w-6 h-6 rounded-full"
                onError={() => setImgError(true)}
              />
              <span className="font-semibold text-sm">{token.ticker}</span>
            </>
          ) : (
            <span className="font-medium text-sm text-muted-foreground">Select</span>
          )}
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="flex-1 text-right">
          {loading ? (
            <div className="h-8 w-32 ml-auto rounded bg-muted animate-pulse-gold" />
          ) : (
            <Input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => onAmountChange?.(e.target.value)}
              readOnly={readOnly}
              className="bg-transparent border-none text-right text-2xl font-mono font-semibold text-foreground placeholder:text-muted-foreground focus-visible:ring-0 p-0 h-auto"
            />
          )}
        </div>
      </div>

      {!readOnly && balance && onAmountChange && (
        <div className="flex gap-1.5 mt-3">
          {PERCENT_BUTTONS.map((pct) => (
            <button
              key={pct}
              onClick={() => handlePercentClick(pct)}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-secondary text-muted-foreground hover:text-foreground hover:bg-cheese-gold/10 hover:text-cheese-gold transition-colors"
            >
              {pct === 100 ? "Max" : `${pct}%`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
