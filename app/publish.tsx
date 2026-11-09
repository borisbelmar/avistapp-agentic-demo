import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { formatCoords, formatDateTime } from "@/components/format";
import colors from "@/theme/colors";

type Params = { photoBase64: string; latitude: string; longitude: string; capturedAt: string };

// Nuevo avistamiento (DESIGN §7.4). La especie y "Publicar" se completan en la Fase 5.
export default function PublishScreen() {
  const { photoBase64, latitude, longitude, capturedAt } = useLocalSearchParams<Params>();

  return (
    <View className="flex-1 bg-paper">
      <View className="flex-row items-center gap-2 px-2 pb-2 pt-14">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="chevron-back" size={24} color={colors.ink.DEFAULT} />
        </Pressable>
        <Text className="font-display text-title text-ink">Nuevo avistamiento</Text>
      </View>
      <ScrollView contentContainerClassName="gap-4 pb-8">
        <Image
          source={{ uri: `data:image/jpeg;base64,${photoBase64}` }}
          style={{ aspectRatio: 4 / 3 }}
          className="w-full"
          resizeMode="cover"
        />
        <View className="gap-2 px-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="location-outline" size={16} color={colors.ink.muted} />
            <Text className="font-sans text-caption text-ink-muted">
              {formatCoords({ latitude: Number(latitude), longitude: Number(longitude) })}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Ionicons name="time-outline" size={16} color={colors.ink.muted} />
            <Text className="font-sans text-caption text-ink-muted">{formatDateTime(capturedAt)}</Text>
          </View>
        </View>
        <View className="gap-3 px-4">
          {/* Fase 5: createSighting. Deshabilitado hasta entonces (5_MVP.md, Fase 4). */}
          <Button title="Publicar" onPress={() => {}} disabled />
          <Button title="Repetir foto" variant="secondary" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </View>
  );
}
