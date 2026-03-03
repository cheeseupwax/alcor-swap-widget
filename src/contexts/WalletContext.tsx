import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { SessionKit, Session } from "@wharfkit/session";
import { WebRenderer } from "@wharfkit/web-renderer";
import { WalletPluginAnchor } from "@wharfkit/wallet-plugin-anchor";
import { WalletPluginCloudWallet } from "@wharfkit/wallet-plugin-cloudwallet";

interface WalletContextType {
  session: Session | null;
  accountName: string;
  isLoggingIn: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  transact: (actions: unknown[]) => Promise<unknown>;
}

const WalletContext = createContext<WalletContextType>({
  session: null,
  accountName: "",
  isLoggingIn: false,
  login: async () => {},
  logout: async () => {},
  transact: async () => {},
});

export const useWallet = () => useContext(WalletContext);

const WAX_CHAIN = {
  id: "1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4",
  url: "https://wax.eosphere.io",
};

let sessionKit: SessionKit | null = null;

function getSessionKit() {
  if (!sessionKit) {
    sessionKit = new SessionKit({
      appName: "CHEESESwap",
      chains: [WAX_CHAIN],
      ui: new WebRenderer(),
      walletPlugins: [
        new WalletPluginAnchor(),
        new WalletPluginCloudWallet(),
      ],
    });
  }
  return sessionKit;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const accountName = session ? String(session.actor) : "";

  // Restore session on mount
  useEffect(() => {
    const kit = getSessionKit();
    kit.restore().then((restored) => {
      if (restored) setSession(restored);
    }).catch(() => {
      // No saved session
    });
  }, []);

  const login = useCallback(async () => {
    setIsLoggingIn(true);
    try {
      const kit = getSessionKit();
      const response = await kit.login();
      setSession(response.session);
    } catch (e) {
      console.error("Login failed:", e);
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const kit = getSessionKit();
      if (session) {
        await kit.logout(session);
      }
      setSession(null);
    } catch (e) {
      console.error("Logout failed:", e);
    }
  }, [session]);

  const transact = useCallback(async (actions: unknown[]) => {
    if (!session) throw new Error("No wallet session");
    const result = await session.transact({ actions: actions as any });
    return result;
  }, [session]);

  return (
    <WalletContext.Provider value={{ session, accountName, isLoggingIn, login, logout, transact }}>
      {children}
    </WalletContext.Provider>
  );
}
