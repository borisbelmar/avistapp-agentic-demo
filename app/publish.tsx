import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

import { useSession } from "@/auth/SessionProvider";
import { Button } from "@/components/Button";
import { formatCoords, formatDateTime } from "@/components/format";
import { SpeciesPicker } from "@/components/SpeciesPicker";
import { listSpecies, type SpeciesListItem } from "@/data/species";
import { createSighting } from "@/data/sightings";
import { errorMessage } from "@/domain/errors";
import colors from "@/theme/colors";

type Params = { photoBase64: string; latitude: string; longitude: string; capturedAt: string };

// Nuevo avistamiento (DESIGN §7.4).
export default function PublishScreen() {
  const { photoBase64, latitude, longitude, capturedAt } = useLocalSearchParams<Params>();
  const db = useSQLiteContext();
  const { user } = useSession();

  const [species, setSpecies] = useState<SpeciesListItem[] | null>(null);
  const [selected, setSelected] = useState<SpeciesListItem | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ponytail: el catálogo es local; si falla, el error genérico aparece sobre "Publicar" y se
  // reintenta reabriendo la pantalla.
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        setSpecies(await listSpecies(db, user));
      } catch (e) {
        setError(errorMessage(e));
      }
    })();
  }, [db, user]);

  async function publish() {
    if (!user || !selected) return;
    setError(null);
    setSaving(true);
    try {
      const { id, isNewSpecies } = await createSighting(db, user, {
        photoBase64,
        location: { latitude: Number(latitude), longitude: Number(longitude) },
        speciesId: selected.id,
        capturedAt,
      });
      // No se restaura saving: evita tocar "Publicar" otra vez durante la animación de cierre.
      router.dismissTo({
        pathname: "/(tabs)",
        params: { publishedId: id, newSpecies: isNewSpecies ? selected.commonName : "" },
      });
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
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
        <View className="gap-1 px-4">
          <Text className="font-sans-semibold text-label text-ink">Especie</Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            disabled={saving}
            accessibilityRole="button"
            className="h-12 flex-row items-center justify-between rounded-xl border border-line-strong bg-white px-4"
          >
            <Text className={`font-sans text-body ${selected ? "text-ink" : "text-ink-muted"}`}>
              {selected?.commonName ?? "Elige la especie"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.ink.muted} />
          </Pressable>
        </View>
        <View className="gap-3 px-4">
          {error ? (
            <View className="rounded-xl bg-danger-50 px-4 py-3">
              <Text className="font-sans text-label text-danger-600">{error}</Text>
            </View>
          ) : null}
          <Button title="Publicar" onPress={publish} disabled={!selected} loading={saving} />
          <Button title="Repetir foto" variant="secondary" onPress={() => router.back()} />
        </View>
      </ScrollView>
      <SpeciesPicker
        visible={pickerOpen}
        species={species}
        onSelect={(s) => {
          setSelected(s);
          setError(null);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
