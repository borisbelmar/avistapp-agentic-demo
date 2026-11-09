import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Fase 1: pantalla de prueba del tema, las fuentes y el área segura. La Fase 3 la reemplaza.
export default function Index() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-paper">
      <View className="gap-2 p-4">
        <Text className="font-display text-title text-ink">
          Avist<Text className="text-primary-600">App</Text>
        </Text>
        <Text className="font-sans text-body text-ink">Fotografía y colecciona las aves de Chile.</Text>
        <Text className="font-display text-heading text-ink">Chucao</Text>
        <Text className="font-scientific text-scientific text-ink-muted">Scelorchilus rubecula</Text>
      </View>
    </SafeAreaView>
  );
}
