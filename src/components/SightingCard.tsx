import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, Text, View } from "react-native";
import Animated, { FadeOut } from "react-native-reanimated";

import type { FeedItem } from "@/data/sightings";
import type { VoteValue } from "@/domain/types";
import colors from "@/theme/colors";

import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { formatCoords, formatRelativeDate, formatScore } from "./format";
import { VoteControl } from "./VoteControl";

type SightingCardProps = {
  item: FeedItem;
  isOwn: boolean;
  isAdmin: boolean;
  voting: boolean;
  onVote: (next: VoteValue | null) => void;
  onDelete: () => void;
};

// Tarjeta del Muro (DESIGN §7.2). Al salir del muro (oculta por un voto o eliminada) se
// desvanece; FadeOut usa ReduceMotion.System (DESIGN §5).
export function SightingCard({ item, isOwn, isAdmin, voting, onVote, onDelete }: SightingCardProps) {
  return (
    <Animated.View exiting={FadeOut}>
      <View className="overflow-hidden rounded-2xl border border-line bg-white">
        <View className="flex-row items-center gap-2 px-4 py-3">
          <Avatar username={item.authorUsername} />
          <Text className="flex-1 font-sans text-caption text-ink-muted">
            <Text className="font-sans-semibold text-ink">{item.authorUsername}</Text>
            {` · ${formatRelativeDate(item.capturedAt)}`}
          </Text>
          {isAdmin ? (
            <Pressable
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel="Eliminar publicación"
              className="h-11 w-11 items-center justify-center"
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger[600]} />
            </Pressable>
          ) : null}
        </View>
        <Image
          source={{ uri: item.photoUrl }}
          style={{ aspectRatio: 4 / 3, opacity: item.isHidden ? 0.5 : 1 }}
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
          {item.isHidden ? (
            <View className="mt-2 flex-row">
              <Badge label="Oculta" />
            </View>
          ) : isOwn ? (
            <View className="mt-2 flex-row items-center gap-2">
              <Text className="font-display text-body text-ink">{formatScore(item.score)}</Text>
              <Text className="font-sans text-caption text-ink-muted">Tu publicación</Text>
            </View>
          ) : (
            <View className="mt-2 flex-row">
              <VoteControl score={item.score} myVote={item.myVote} disabled={voting} onChange={onVote} />
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}
