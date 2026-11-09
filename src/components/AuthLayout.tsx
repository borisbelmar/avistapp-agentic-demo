import type { ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Compartido por Iniciar sesión y Crear cuenta (DESIGN §7.1). KeyboardAvoidingView con
// behavior="padding" en ambas plataformas: en Android edge-to-edge ya no redimensiona la
// ventana sola (STACK §8).
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-secondary-50">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="grow justify-center gap-6 p-4">
          <View className="gap-2">
            <Text className="text-center font-display text-[36px] text-ink">
              Avist<Text className="text-primary-600">App</Text>
            </Text>
            <Text className="text-center font-sans text-body text-ink-muted">
              Fotografía y colecciona las aves de Chile.
            </Text>
          </View>
          <View className="gap-4 rounded-3xl bg-white p-6">{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
