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

import { initDb } from "@/data/migrations";

// En el nivel del módulo no hay contexto async: el .catch cumple el papel del try (STACK §6).
SplashScreen.preventAutoHideAsync().catch(console.error);

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
    if (loaded || error) SplashScreen.hide();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SQLiteProvider databaseName="avistapp.db" onInit={initDb}>
      <Stack screenOptions={{ headerShown: false }} />
    </SQLiteProvider>
  );
}
