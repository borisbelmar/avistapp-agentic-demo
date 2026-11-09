import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Muro vacío (DESIGN §7.2). La lista de publicaciones llega en la Fase 5.
export default function FeedScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-paper">
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-center font-sans text-body text-ink-muted">
          Aún no hay avistamientos. ¡Sé el primero en publicar uno!
        </Text>
      </View>
    </SafeAreaView>
  );
}
