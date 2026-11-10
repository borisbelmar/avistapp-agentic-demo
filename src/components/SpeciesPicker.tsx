import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import type { SpeciesListItem } from "@/data/species";
import colors from "@/theme/colors";

import { normalizeForSearch } from "./format";

type SpeciesPickerProps = {
  visible: boolean;
  species: SpeciesListItem[] | null;
  onSelect: (species: SpeciesListItem) => void;
  onClose: () => void;
};

// Selector de especie (DESIGN §7.5): Modal a pantalla completa, pageSheet en iOS.
export function SpeciesPicker({ visible, species, onSelect, onClose }: SpeciesPickerProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const q = normalizeForSearch(query.trim());
  const results = (species ?? []).filter(
    (s) => q === "" || normalizeForSearch(`${s.commonName} ${s.scientificName}`).includes(q),
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-paper">
        {/* pageSheet en iOS no queda bajo la barra de estado; en Android el Modal es de borde a borde. */}
        <View className={`flex-row items-center justify-between px-4 pb-2 ${Platform.OS === "ios" ? "pt-4" : "pt-14"}`}>
          <Text className="font-display text-title text-ink">Elige la especie</Text>
          <Pressable
            onPress={onClose}
            className="h-11 w-11 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <Ionicons name="close" size={24} color={colors.ink.DEFAULT} />
          </Pressable>
        </View>
        <View className="px-4 pb-2">
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Buscar por nombre común o científico"
            accessibilityLabel="Buscar por nombre común o científico"
            placeholderTextColor={colors.ink.muted}
            autoCorrect={false}
            autoCapitalize="none"
            className={`h-12 rounded-xl bg-white px-4 font-sans text-[16px] text-ink ${
              focused ? "border-2 border-primary-600" : "border border-line-strong"
            }`}
          />
        </View>
        {species === null ? (
          <View className="mt-8">
            <ActivityIndicator color={colors.primary[600]} />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(s) => s.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text className="p-4 text-center font-sans text-body text-ink-muted">
                No encontramos esa especie.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelect(item)}
                accessibilityRole="button"
                className="gap-0.5 border-b border-line px-4 py-3 active:bg-secondary-50"
              >
                <Text className="font-display text-body text-ink">{item.commonName}</Text>
                <Text className="font-scientific text-scientific text-ink-muted">{item.scientificName}</Text>
                {item.inCollection ? (
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="leaf" size={16} color={colors.secondary[600]} />
                    <Text className="font-sans text-caption text-secondary-700">En tu colección</Text>
                  </View>
                ) : null}
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}
