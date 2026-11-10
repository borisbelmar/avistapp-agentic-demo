import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import { VoteValue } from "@/domain/types";
import colors from "@/theme/colors";

import { formatScore } from "./format";

type IconName = ComponentProps<typeof Ionicons>["name"];

const BUTTONS: Record<VoteValue, { label: string; icon: IconName; activeIcon: IconName; activeColor: string }> = {
  [VoteValue.UP]: {
    label: "Voto positivo",
    icon: "caret-up-outline",
    activeIcon: "caret-up",
    activeColor: colors.secondary[600],
  },
  [VoteValue.DOWN]: {
    label: "Voto negativo",
    icon: "caret-down-outline",
    activeIcon: "caret-down",
    activeColor: colors.danger[600],
  },
};

type VoteButtonProps = {
  value: VoteValue;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
};

// withTiming/withSequence usan ReduceMotion.System por defecto, así que con la reducción de
// movimiento activa el ícono no crece (DESIGN §5) sin necesidad de useReducedMotion. get()/set()
// es la API de Reanimated pensada para el React Compiler, en vez de sharedValue.value = ….
function VoteButton({ value, active, disabled, onPress }: VoteButtonProps) {
  const { label, icon, activeIcon, activeColor } = BUTTONS[value];
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  function handlePress() {
    scale.set(withSequence(withTiming(1.2, { duration: 75 }), withTiming(1, { duration: 75 })));
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      className="h-11 w-11 items-center justify-center"
    >
      <Animated.View style={animatedStyle}>
        <Ionicons name={active ? activeIcon : icon} size={28} color={active ? activeColor : colors.ink.muted} />
      </Animated.View>
    </Pressable>
  );
}

type VoteControlProps = {
  score: number;
  myVote: VoteValue | null;
  disabled: boolean;
  onChange: (next: VoteValue | null) => void;
};

// ▲ puntaje ▼ (DESIGN §7.2, §11): tocar el voto activo lo retira (null); tocar el otro lo
// cambia. Sin indicador de carga: la escritura es local e instantánea; disabled solo evita el
// doble toque mientras se guarda.
export function VoteControl({ score, myVote, disabled, onChange }: VoteControlProps) {
  const toggle = (value: VoteValue) => onChange(myVote === value ? null : value);

  return (
    <View className="flex-row items-center">
      <VoteButton
        value={VoteValue.UP}
        active={myVote === VoteValue.UP}
        disabled={disabled}
        onPress={() => toggle(VoteValue.UP)}
      />
      <Text className="min-w-10 text-center font-display text-body text-ink">{formatScore(score)}</Text>
      <VoteButton
        value={VoteValue.DOWN}
        active={myVote === VoteValue.DOWN}
        disabled={disabled}
        onPress={() => toggle(VoteValue.DOWN)}
      />
    </View>
  );
}
