import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/SessionProvider";
import { EmptyState } from "@/components/EmptyState";
import { NewSpeciesBanner } from "@/components/NewSpeciesBanner";
import { SightingCard } from "@/components/SightingCard";
import { castVote, deleteSighting, getFeed, removeVote, type FeedItem } from "@/data/sightings";
import { errorMessage } from "@/domain/errors";
import type { VoteValue } from "@/domain/types";
import colors from "@/theme/colors";

// Muro (DESIGN §7.2): lista de publicaciones, de la más reciente a la más antigua. Se
// actualiza al volver a la pantalla (useFocusEffect) y al deslizar hacia abajo (RefreshControl).
export default function FeedScreen() {
  const db = useSQLiteContext();
  const { user } = useSession();
  const { publishedId, newSpecies } = useLocalSearchParams<{ publishedId?: string; newSpecies?: string }>();
  const listRef = useRef<FlatList<FeedItem>>(null);

  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setItems(await getFeed(db, user));
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

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Vota, cambia o retira el voto (V1, V4) y recarga: actualiza el puntaje y saca la tarjeta
  // si el voto la ocultó (SG6), con el FadeOut de SightingCard.
  async function vote(item: FeedItem, next: VoteValue | null) {
    if (!user) return;
    setVotingId(item.id);
    try {
      if (next === null) await removeVote(db, user, item.id);
      else await castVote(db, user, item.id, next);
    } catch (e) {
      Alert.alert(errorMessage(e));
    }
    await load();
    setVotingId(null);
  }

  // Eliminar publicación (DESIGN §8, SG4): confirmación con estilo destructivo antes de borrar.
  function confirmDelete(item: FeedItem) {
    Alert.alert("¿Eliminar publicación?", "Se borrarán la foto y sus votos. No se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          if (!user) return;
          try {
            await deleteSighting(db, user, item.id);
          } catch (e) {
            Alert.alert(errorMessage(e));
          }
          await load();
        },
      },
    ]);
  }

  // Si el Muro estaba desplazado, la publicación nueva queda a la vista.
  useEffect(() => {
    if (publishedId) listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [publishedId]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-paper">
      {/* El key reinicia el temporizador de 3 s en cada publicación, incluso con la misma especie. */}
      {newSpecies ? <NewSpeciesBanner key={publishedId} commonName={newSpecies} /> : null}
      {error ? (
        <EmptyState message={error} actionTitle="Reintentar" onAction={load} />
      ) : items === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="grow gap-4 p-4"
          extraData={votingId}
          renderItem={({ item }) => (
            <SightingCard
              item={item}
              isOwn={item.authorId === user?.id}
              isAdmin={user?.role === "ADMIN"}
              voting={votingId === item.id}
              onVote={(next) => vote(item, next)}
              onDelete={() => confirmDelete(item)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              colors={[colors.primary[600]]}
              tintColor={colors.primary[600]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              message="Aún no hay avistamientos. ¡Sé el primero en publicar uno!"
              actionTitle="Tomar una foto"
              onAction={() => router.push("/capture")}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
