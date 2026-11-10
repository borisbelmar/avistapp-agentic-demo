import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Text, View } from "react-native";

import type { FeedItem } from "@/data/sightings";
import colors from "@/theme/colors";

import { Avatar } from "./Avatar";
import { formatCoords, formatRelativeDate, formatScore } from "./format";

type SightingCardProps = {
  item: FeedItem;
  isOwn: boolean;
};

// Tarjeta del Muro (DESIGN §7.2). VoteControl para publicaciones ajenas llega en la Fase 6.
export function SightingCard({ item, isOwn }: SightingCardProps) {
  return (
    <View className="overflow-hidden rounded-2xl border border-line bg-white">
      <View className="flex-row items-center gap-2 px-4 py-3">
        <Avatar username={item.authorUsername} />
        <Text className="font-sans text-caption text-ink-muted">
          <Text className="font-sans-semibold text-ink">{item.authorUsername}</Text>
          {` · ${formatRelativeDate(item.capturedAt)}`}
        </Text>
      </View>
      <Image
        source={{ uri: item.photoUrl }}
        style={{ aspectRatio: 4 / 3 }}
        className="w-full"
        resizeMode="cover"
        accessible
        accessibilityLabel={`Foto de ${item.commonName} por ${item.authorUsername}`}
      />
      <View className="gap-1 px-4 py-3">
        <Text className="font-display text-heading text-ink">{item.commonName}</Text>
        <Text className="font-scientific text-scientific text-ink-muted">{item.scientificName}</Text>
        <View className="flex-row items-center gap-2">
          <Ionicons name="location-outline" size={16} color={colors.ink.muted} />
          <Text className="font-sans text-caption text-ink-muted">{formatCoords(item)}</Text>
        </View>
        {isOwn ? (
          <View className="mt-2 flex-row items-center gap-2">
            <Text className="font-display text-body text-ink">{formatScore(item.score)}</Text>
            <Text className="font-sans text-caption text-ink-muted">Tu publicación</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
