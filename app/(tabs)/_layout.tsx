import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Tabs } from "expo-router";
import { View } from "react-native";

import colors from "@/theme/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.ink.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line.DEFAULT },
        tabBarLabelStyle: { fontFamily: "Figtree_600SemiBold", fontSize: 14 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Muro",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "images" : "images-outline"} color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: "Capturar",
          // tabBarShowLabel es global y se lee de la pestaña enfocada (nunca "new", por el
          // preventDefault de abajo): no sirve para ocultar la etiqueta de una sola pestaña.
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: "Capturar",
          // El contenedor del ícono mide 31×28 por defecto; se agranda para el círculo de 48 px (DESIGN §6).
          tabBarIconStyle: { width: 48, height: 48 },
          tabBarIcon: () => (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-600">
              <Ionicons name="camera" size={24} color={colors.white} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push("/capture");
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} color={color as string} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
