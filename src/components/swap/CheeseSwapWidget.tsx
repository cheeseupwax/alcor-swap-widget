import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownUp, Settings, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SwapTokenInput } from "./SwapTokenInput";
import { TokenSelector } from "./TokenSelector";
import { useSwapTokens } from "@/hooks/useSwapTokens";
import { useSwapRoute } from "@/hooks/useSwapRoute";
import { useWallet } from "@/contexts/WalletContext";
import { type SwapToken, formatTokenAmount } from "@/lib/swapApi";
import { toast } from "sonner";

interface CheeseSwapWidgetProps {
  defaultInputTicker?: string;
  defaultOutputTicker?: string;
  onLogin?: () => void;
  isLoggingIn?: boolean;
}

const SLIPPAGE_PRESETS = [0.5, 1, 3];

export function CheeseSwapWidget({
  defaultInputTicker = "WAX",
  defaultOutputTicker = "CHEESE",
  onLogin,
  isLoggingIn = false,
}: CheeseSwapWidgetProps) {
  const { tokens } = useSwapTokens();
  const { accountName, transact } = useWallet();

  const [tokenIn, setTokenIn] = useState<SwapToken | null>(null);
  const [tokenOut, setTokenOut] = useState<SwapToken | null>(null);
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState(() => {
    const saved = localStorage.getItem("cheese-swap-slippage");
    return saved ? parseFloat(saved) : 1;
  });
  const [customSlippage, setCustomSlippage] = useState("");
  const [selectorOpen, setSelectorOpen] = useState<"in" | "out" | null>(null);
  const [showRouteDetails, setShowRouteDetails] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  // Set defaults when tokens load
  useEffect(() => {
    if (tokens.length > 0 && !tokenIn) {
      const defaultIn = tokens.find((t) => t.ticker === defaultInputTicker);
      const defaultOut = tokens.find((t) => t.ticker === defaultOutputTicker);
      if (defaultIn) setTokenIn(defaultIn);
      if (defaultOut) setTokenOut(defaultOut);
    }
  }, [tokens, defaultInputTicker, defaultOutputTicker, tokenIn]);

  // Persist slippage
  useEffect(() => {
    localStorage.setItem("cheese-swap-slippage", slippage.toString());
  }, [slippage]);

  const { route, isFetching: routeLoading, error: routeError } = useSwapRoute(
    tokenIn,
    tokenOut,
    amountIn,
    slippage,
    accountName || "placeholder111"
  );

  const handleFlip = useCallback(() => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn("");
  }, [tokenIn, tokenOut]);

  const handleSlippageChange = (val: number) => {
    setSlippage(val);
    setCustomSlippage("");
  };

  const handleCustomSlippage = (val: string) => {
    setCustomSlippage(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && num <= 50) {
      setSlippage(num);
    }
  };

  const estimatedOutput = route?.amount_out
    ? formatTokenAmount(route.amount_out, tokenOut?.precision ?? 4)
    : "";

  const handleSwap = async () => {
    if (!route) return;
    setIsSwapping(true);
    try {
      await transact(route.actions);
      toast.success("Swap successful!", {
        description: `Swapped ${amountIn} ${tokenIn?.ticker} → ${estimatedOutput} ${tokenOut?.ticker}`,
      });
      setAmountIn("");
    } catch (e: any) {
      const msg = e?.message || "Swap failed";
      if (!msg.includes("cancel") && !msg.includes("reject")) {
        toast.error("Swap failed", { description: msg });
      }
    } finally {
      setIsSwapping(false);
    }
  };

  const canSwap = !!route && !!accountName && parseFloat(amountIn) > 0 && !routeLoading;

  return (
    <div className="w-full max-w-[440px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground">Swap</h2>
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-panel transition-colors text-muted-foreground hover:text-foreground">
              <Settings className="w-5 h-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-card border-border" align="end">
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">Slippage Tolerance</div>
              <div className="flex gap-1.5">
                {SLIPPAGE_PRESETS.map((val) => (
                  <button
                    key={val}
                    onClick={() => handleSlippageChange(val)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      slippage === val && !customSlippage
                        ? "bg-primary text-primary-foreground"
                        : "bg-panel hover:bg-panel-hover text-muted-foreground"
                    }`}
                  >
                    {val}%
                  </button>
                ))}
                <input
                  type="number"
                  placeholder="Custom"
                  value={customSlippage}
                  onChange={(e) => handleCustomSlippage(e.target.value)}
                  className="flex-1 bg-panel rounded-lg text-center text-sm text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-1 focus:ring-primary px-2"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Current: {slippage}%
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Swap panels */}
      <div className="relative space-y-1">
        <SwapTokenInput
          label="You pay"
          token={tokenIn}
          amount={amountIn}
          onAmountChange={setAmountIn}
          onTokenClick={() => setSelectorOpen("in")}
        />

        {/* Flip button */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9, rotate: 180 }}
            onClick={handleFlip}
            className="w-10 h-10 rounded-xl bg-card border-4 border-background flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowDownUp className="w-4 h-4" />
          </motion.button>
        </div>

        <SwapTokenInput
          label="You receive"
          token={tokenOut}
          amount={estimatedOutput}
          onTokenClick={() => setSelectorOpen("out")}
          readOnly
          loading={routeLoading && parseFloat(amountIn) > 0}
        />
      </div>

      {/* Route error */}
      {routeError && parseFloat(amountIn) > 0 && (
        <div className="mt-3 flex items-center gap-2 text-destructive text-sm px-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Unable to find a route for this swap</span>
        </div>
      )}

      {/* Route details */}
      {route && (
        <div className="mt-3">
          <button
            onClick={() => setShowRouteDetails(!showRouteDetails)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-panel hover:bg-panel-hover transition-colors text-sm"
          >
            <span className="text-muted-foreground">
              1 {tokenIn?.ticker} ≈{" "}
              <span className="text-foreground font-mono">
                {route.amount_out && amountIn
                  ? formatTokenAmount(
                      parseFloat(route.amount_out) / parseFloat(amountIn),
                      tokenOut?.precision ?? 4
                    )
                  : "—"}{" "}
                {tokenOut?.ticker}
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${showRouteDetails ? "rotate-180" : ""}`}
            />
          </button>

          <AnimatePresence>
            {showRouteDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 py-2 space-y-2 text-sm">
                  {route.price_impact !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price Impact</span>
                      <span
                        className={
                          route.price_impact > 5
                            ? "text-destructive"
                            : route.price_impact > 2
                            ? "text-warning"
                            : "text-success"
                        }
                      >
                        {route.price_impact.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Slippage</span>
                    <span className="text-foreground">{slippage}%</span>
                  </div>
                  {route.routes && route.routes.length > 0 && (
                    <div>
                      <span className="text-muted-foreground text-xs">Route</span>
                      <div className="mt-1 space-y-1">
                        {route.routes.map((r, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <span className="px-1.5 py-0.5 bg-secondary rounded text-foreground font-medium">
                              {r.exchange}
                            </span>
                            <span>
                              {r.token_in} → {r.token_out}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Swap / Connect button */}
      <motion.button
        whileHover={!accountName || canSwap ? { scale: 1.01 } : {}}
        whileTap={!accountName || canSwap ? { scale: 0.99 } : {}}
        onClick={!accountName ? onLogin : handleSwap}
        disabled={accountName ? !canSwap || isSwapping : isLoggingIn}
        className={`w-full mt-4 py-4 rounded-xl font-bold text-base transition-all ${
          !accountName
            ? "bg-primary text-primary-foreground glow-gold hover:glow-gold-strong"
            : canSwap
            ? "bg-primary text-primary-foreground glow-gold hover:glow-gold-strong"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {isLoggingIn ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Connecting...
          </span>
        ) : isSwapping ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Swapping...
          </span>
        ) : !accountName ? (
          "Connect Wallet"
        ) : !tokenIn || !tokenOut ? (
          "Select tokens"
        ) : !amountIn || parseFloat(amountIn) <= 0 ? (
          "Enter amount"
        ) : routeLoading ? (
          "Finding best route..."
        ) : routeError ? (
          "No route available"
        ) : (
          "Swap"
        )}
      </motion.button>

      {/* Token selectors */}
      <TokenSelector
        open={selectorOpen === "in"}
        onClose={() => setSelectorOpen(null)}
        onSelect={setTokenIn}
        selectedToken={tokenIn}
      />
      <TokenSelector
        open={selectorOpen === "out"}
        onClose={() => setSelectorOpen(null)}
        onSelect={setTokenOut}
        selectedToken={tokenOut}
      />
    </div>
  );
}
