import { CheeseSwapWidget } from "@/components/swap/CheeseSwapWidget";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-cheese-gold/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-[440px]">
        {/* Logo / Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            🧀 <span className="text-primary">CHEESE</span>Swap
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
          />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Powered by WaxOnEdge routing
        </p>
      </div>
    </div>
  );
};

export default Index;
