import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "@/auth/SessionProvider";
import { EmptyState } from "@/components/EmptyState";
import { NewSpeciesBanner } from "@/components/NewSpeciesBanner";
import { SightingCard } from "@/components/SightingCard";
import { getFeed, type FeedItem } from "@/data/sightings";
import { errorMessage } from "@/domain/errors";
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
          renderItem={({ item }) => <SightingCard item={item} isOwn={item.authorId === user?.id} />}
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
