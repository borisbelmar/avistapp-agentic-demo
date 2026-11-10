import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { SlideInUp, SlideOutUp } from "react-native-reanimated";

import { SPECIES_BONUS } from "@/domain/constants";

import { formatScore } from "./format";

type NewSpeciesBannerProps = {
  commonName: string;
};

// Aviso de especie nueva (DESIGN §7.4): se oculta solo a los 3 s. Animated.View va sin
// className (css-interop no lo registra). Las animaciones de layout de Reanimated usan
// ReduceMotion.System por defecto, así que respetan la reducción de movimiento (DESIGN §5)
// sin useReducedMotion.
export function NewSpeciesBanner({ commonName }: NewSpeciesBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View entering={SlideInUp} exiting={SlideOutUp}>
      <View className="mx-4 mt-2 rounded-xl bg-primary-50 px-4 py-3" accessibilityLiveRegion="polite">
        <Text className="font-sans-semibold text-label text-primary-700">
          {`¡Nueva especie para tu colección! ${commonName} · ${formatScore(SPECIES_BONUS)} puntos`}
        </Text>
      </View>
    </Animated.View>
  );
}
