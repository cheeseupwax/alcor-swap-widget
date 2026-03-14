import { CheeseSwapWidget } from "@/components/swap/CheeseSwapWidget";
import { useWallet } from "@/contexts/WalletContext";
import { LogOut, Wallet } from "lucide-react";

const Index = () => {
  const { accountName, login, logout, isLoggingIn } = useWallet();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-cheese-gold/5 blur-[120px]" />
      </div>

      {/* Wallet status bar */}
      {accountName && (
        <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm">
            <Wallet className="w-4 h-4 text-primary" />
            <span className="font-mono text-foreground">{accountName}</span>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="Disconnect wallet"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="relative w-full max-w-[440px]">
        {/* Logo / Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            <span className="text-foreground">Alcor</span> <span className="text-primary">Swap</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Swap tokens on WAX with the best rates
          </p>
        </div>

        {/* Widget card */}
        <div className="bg-card rounded-2xl border border-border p-5 glow-gold">
          <CheeseSwapWidget
            defaultInputTicker="WAX"
            defaultOutputTicker="CHEESE"
            onLogin={login}
            isLoggingIn={isLoggingIn}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by{" "}
          <a
            href="https://alcor.exchange/v/wax/swap?input=wax-eosio.token&output=cheese-cheeseburger"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Alcor Exchange
          </a>
        </p>
      </div>
    </div>
  );
};

export default Index;
