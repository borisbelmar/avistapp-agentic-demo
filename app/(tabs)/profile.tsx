import Ionicons from "@expo/vector-icons/Ionicons";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/SessionProvider";
import { errorMessage } from "@/domain/errors";
import colors from "@/theme/colors";

// Perfil mínimo de la Fase 3: nombre de usuario y "Cerrar sesión". Avatar, insignia ADMIN,
// puntaje y colección llegan en la Fase 7.
export default function ProfileScreen() {
  const { user, signOut } = useSession();

  function confirmSignOut() {
    Alert.alert("¿Cerrar sesión?", undefined, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert(errorMessage(error));
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-paper">
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="font-display text-heading text-ink">{user?.username}</Text>
        <Pressable
          onPress={confirmSignOut}
          className="h-11 w-11 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <Ionicons name="log-out-outline" size={24} color={colors.ink.DEFAULT} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
