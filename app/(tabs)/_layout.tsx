import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import colors from "@/theme/colors";

// La pestaña Capturar se agrega en la Fase 4.
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
