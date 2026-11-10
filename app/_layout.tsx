import "../global.css";

import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
} from "@expo-google-fonts/figtree";
import { Fraunces_400Regular_Italic, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider } from "expo-sqlite";
import { useEffect } from "react";

import { SessionProvider, useSession } from "@/auth/SessionProvider";
import { initDb } from "@/data/migrations";

// En el nivel del módulo no hay contexto async: el .catch cumple el papel del try (STACK §6).
SplashScreen.preventAutoHideAsync().catch(console.error);

function RootNavigator() {
  const { user, isLoading } = useSession();

  // La pantalla de inicio se oculta cuando terminó de restaurarse la sesión (no solo las fuentes).
  useEffect(() => {
    if (!isLoading) SplashScreen.hide();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
      </Stack.Protected>
      <Stack.Protected guard={!!user} redirectTo="/login">
        <Stack.Screen name="(tabs)" options={{ presentation: "card" }} />
        <Stack.Screen name="my-sightings" options={{ presentation: "card" }} />
        <Stack.Screen name="capture" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="publish" options={{ presentation: "fullScreenModal" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_400Regular_Italic,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
  });

  useEffect(() => {
    if (error) console.error(error);
  }, [error]);

  if (!loaded && !error) return null;

  return (
    <SQLiteProvider databaseName="avistapp.db" onInit={initDb}>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </SQLiteProvider>
  );
}
