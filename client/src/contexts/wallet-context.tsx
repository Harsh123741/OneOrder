import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface WalletContextType {
  balance: string;
  updateBalance: () => Promise<void>;
  refreshBalance: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState<string>("0.00");

  const updateBalance = async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await apiRequest("GET", `/api/auth/me`);
      const userData = await response.json();
      setBalance(userData.walletBalance || "0.00");
    } catch (error) {
      console.error("Failed to fetch wallet balance:", error);
    }
  };

  const refreshBalance = () => {
    updateBalance();
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      updateBalance();
    }
  }, [isAuthenticated, user]);

  // Update balance from user prop when it changes
  useEffect(() => {
    if (user?.walletBalance) {
      setBalance(user.walletBalance);
    }
  }, [user?.walletBalance]);

  return (
    <WalletContext.Provider value={{ balance, updateBalance, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
