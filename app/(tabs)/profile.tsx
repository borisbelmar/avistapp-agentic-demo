import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/SessionProvider";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { formatScore } from "@/components/format";
import { ProgressBar } from "@/components/ProgressBar";
import { getProfile, type Profile } from "@/data/profile";
import { SPECIES_BONUS } from "@/domain/constants";
import { errorMessage } from "@/domain/errors";
import colors from "@/theme/colors";

// Perfil (DESIGN §7.6): avatar, nombre, insignia ADMIN y "Salir"; puntaje desglosado (C3),
// progreso de la colección (C2) y la grilla con la foto visible más reciente de cada especie
// (C1). Se recarga al tomar el foco: refleja votos y publicaciones hechos en otras pantallas.
export default function ProfileScreen() {
  const db = useSQLiteContext();
  const { user, signOut } = useSession();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setProfile(await getProfile(db, user));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [db, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmSignOut() {
    Alert.alert("¿Cerrar sesión?", undefined, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Cerrar sesión",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (e) {
            Alert.alert(errorMessage(e));
          }
        },
      },
    ]);
  }

  const owner = profile ?? user;
  const scoreText = profile ? (profile.userScore < 0 ? formatScore(profile.userScore) : String(profile.userScore)) : "";
  const progressText = profile ? `${profile.collection.length} de ${profile.catalogSize} especies` : "";

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-paper">
      {owner ? (
        <View className="flex-row items-center gap-2 px-4 py-2">
          <Avatar username={owner.username} />
          <View className="flex-1 flex-row items-center gap-2">
            <Text className="shrink font-display text-heading text-ink" numberOfLines={1}>
              {owner.username}
            </Text>
            {owner.role === "ADMIN" ? <Badge label="ADMIN" variant="secondary" /> : null}
          </View>
          <Pressable
            onPress={confirmSignOut}
            className="h-11 w-11 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
          >
            <Ionicons name="log-out-outline" size={24} color={colors.ink.DEFAULT} />
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <EmptyState message={error} actionTitle="Reintentar" onAction={load} />
      ) : profile === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={profile.collection}
          keyExtractor={(item) => item.speciesId}
          numColumns={3}
          contentContainerClassName="px-3 pb-4"
          ListHeaderComponent={
            <View className="gap-6 px-1 pb-4 pt-2">
              <View>
                <Text className="font-sans-semibold text-label text-ink">Puntaje</Text>
                <Text className="font-display text-title text-ink">{scoreText}</Text>
                <Text className="font-sans text-caption text-ink-muted">
                  {`Votos ${formatScore(profile.votesTotal)} · Especies ${formatScore(profile.speciesBonus)}`}
                </Text>
              </View>
              <View>
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="font-sans-semibold text-label text-ink">Colección</Text>
                  <Text className="shrink text-right font-sans text-caption text-ink-muted">{progressText}</Text>
                </View>
                <ProgressBar progress={profile.progress} />
              </View>
              <Button
                title="Mis publicaciones"
                variant="secondary"
                onPress={() => router.push("/my-sightings")}
              />
            </View>
          }
          renderItem={({ item }) => (
            <View className="w-1/3 p-1">
              <Image
                source={{ uri: item.photoUrl }}
                className="aspect-square w-full rounded-xl"
                resizeMode="cover"
                accessible
                accessibilityLabel={`Foto de ${item.commonName} por ${profile.username}`}
              />
              <Text className="mt-1 font-sans text-caption text-ink" numberOfLines={2}>
                {item.commonName}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text className="px-1 text-center font-sans text-body text-ink-muted">
              {`Tu colección está vacía. Cada especie nueva que fotografíes suma ${SPECIES_BONUS} puntos.`}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
