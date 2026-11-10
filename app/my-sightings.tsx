import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, Text, View } from "react-native";

import { useSession } from "@/auth/SessionProvider";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { confirmDeleteSighting } from "@/components/confirmDeleteSighting";
import { EmptyState } from "@/components/EmptyState";
import { formatRelativeDate, formatScore } from "@/components/format";
import { SpeciesPicker } from "@/components/SpeciesPicker";
import { listSpecies, type SpeciesListItem } from "@/data/species";
import { changeSpecies, deleteSighting, getMySightings, type MySightingItem } from "@/data/sightings";
import { errorMessage } from "@/domain/errors";
import colors from "@/theme/colors";

type Busy = { id: string; action: "change" | "delete" };

// Mis publicaciones (DESIGN §7.7, Q4): todas las publicaciones propias, ocultas incluidas.
// "Cambiar especie" (SG3) y "Eliminar" (SG4) recargan la lista al terminar; busy asegura que
// solo una operación corre a la vez en toda la pantalla.
export default function MySightingsScreen() {
  const db = useSQLiteContext();
  const { user } = useSession();

  const [items, setItems] = useState<MySightingItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [species, setSpecies] = useState<SpeciesListItem[] | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setItems(await getMySightings(db, user));
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

  // La lista se vuelve a leer en cada apertura: "En tu colección" refleja los cambios recién hechos.
  async function openPicker(id: string) {
    if (!user) return;
    setSpecies(null);
    setPickerFor(id);
    try {
      setSpecies(await listSpecies(db, user));
    } catch (e) {
      setPickerFor(null);
      Alert.alert(errorMessage(e));
    }
  }

  async function onSelect(s: SpeciesListItem) {
    if (!user || !pickerFor) return;
    const id = pickerFor;
    setPickerFor(null);
    setBusy({ id, action: "change" });
    try {
      await changeSpecies(db, user, id, s.id);
    } catch (e) {
      Alert.alert(errorMessage(e));
    }
    await load();
    setBusy(null);
  }

  function confirmDelete(item: MySightingItem) {
    confirmDeleteSighting(async () => {
      if (!user) return;
      setBusy({ id: item.id, action: "delete" });
      try {
        await deleteSighting(db, user, item.id);
      } catch (e) {
        Alert.alert(errorMessage(e));
      }
      await load();
      setBusy(null);
    });
  }

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
        <Text className="font-display text-title text-ink">Mis publicaciones</Text>
      </View>
      {error ? (
        <EmptyState message={error} actionTitle="Reintentar" onAction={load} />
      ) : items === null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary[600]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="grow gap-4 p-4"
          extraData={busy}
          renderItem={({ item }) => {
            const changing = busy?.id === item.id && busy.action === "change";
            const deleting = busy?.id === item.id && busy.action === "delete";
            return (
              <View className="gap-3 rounded-2xl border border-line bg-white p-3">
                <View className="flex-row gap-3">
                  <Image
                    source={{ uri: item.photoUrl }}
                    className="h-[72px] w-[72px] rounded-xl"
                    resizeMode="cover"
                    accessible
                    accessibilityLabel={`Foto de ${item.commonName} por ${user?.username}`}
                  />
                  <View className="flex-1 gap-1">
                    <View className="flex-row items-start justify-between gap-2">
                      <Text className="flex-1 font-display text-heading text-ink">{item.commonName}</Text>
                      <Text className="font-display text-body text-ink">{formatScore(item.score)}</Text>
                    </View>
                    <Text className="font-sans text-caption text-ink-muted">
                      {formatRelativeDate(item.capturedAt)}
                    </Text>
                    {item.isHidden ? (
                      <View className="items-start gap-1">
                        <Badge label="Oculta" />
                        <Text className="font-sans text-caption text-ink-muted">Ya no aparece en el muro.</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View className="flex-row justify-between gap-3">
                  <Button
                    title="Cambiar especie"
                    variant="secondary"
                    onPress={() => openPicker(item.id)}
                    loading={changing}
                    disabled={busy !== null && !changing}
                  />
                  <Button
                    title="Eliminar"
                    variant="danger"
                    onPress={() => confirmDelete(item)}
                    loading={deleting}
                    disabled={busy !== null && !deleting}
                  />
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              message="Todavía no has publicado avistamientos."
              actionTitle="Tomar una foto"
              onAction={() => router.push("/capture")}
            />
          }
        />
      )}
      <SpeciesPicker
        visible={pickerFor !== null}
        species={species}
        onClose={() => setPickerFor(null)}
        onSelect={onSelect}
      />
    </View>
  );
}
