import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

type ProgressBarProps = {
  progress: number; // 0..1
};

// Progreso de la colección (DESIGN §7.6, §11): alto 8 px, fondo secondary-100, relleno
// primary-600, radio completo. Se llena de 0 al valor actual en 400 ms cada vez que la pestaña
// toma el foco (DESIGN §5). withTiming usa ReduceMotion.System por defecto: con la reducción de
// movimiento activa salta directo al valor final, sin necesidad de useReducedMotion (igual que
// VoteControl). Decorativa: el texto "X de N especies" junto a ella comunica el valor (DESIGN §9).
export function ProgressBar({ progress }: ProgressBarProps) {
  const fill = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      fill.set(withSequence(withTiming(0, { duration: 0 }), withTiming(progress, { duration: 400 })));
    }, [fill, progress]),
  );

  // Animated.View va sin className: css-interop no lo registra (ver NewSpeciesBanner).
  const animatedStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` as const }));

  return (
    <View className="h-2 overflow-hidden rounded-full bg-secondary-100">
      <Animated.View style={[{ height: "100%" }, animatedStyle]}>
        <View className="flex-1 rounded-full bg-primary-600" />
      </Animated.View>
    </View>
  );
}
