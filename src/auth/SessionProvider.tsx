import { useSQLiteContext } from "expo-sqlite";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import type { User } from "@/domain/types";

import { logout, restoreSession, saveSession } from "./auth";

type SessionContextValue = {
  user: User | null;
  isLoading: boolean;
  signIn(user: User): Promise<void>;
  signOut(): Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Si restaurar falla, la app queda en Iniciar sesión en vez de colgar la pantalla de inicio.
  useEffect(() => {
    (async () => {
      try {
        setUser(await restoreSession(db));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [db]);

  const value: SessionContextValue = {
    user,
    isLoading,
    async signIn(next) {
      await saveSession(next.id);
      setUser(next);
    },
    async signOut() {
      await logout();
      setUser(null);
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (context === null) throw new Error("useSession debe usarse dentro de SessionProvider");
  return context;
}
