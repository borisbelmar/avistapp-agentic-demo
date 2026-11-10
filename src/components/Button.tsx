import { ActivityIndicator, Pressable, Text } from "react-native";

import colors from "@/theme/colors";

type Variant = "primary" | "secondary" | "danger";

const VARIANTS: Record<Variant, { container: string; text: string; spinner: string }> = {
  primary: {
    container: "bg-primary-600 active:bg-primary-700",
    text: "text-white",
    spinner: colors.white,
  },
  secondary: {
    container: "bg-secondary-100",
    text: "text-secondary-700",
    spinner: colors.secondary[700],
  },
  danger: {
    container: "bg-transparent",
    text: "text-danger-600",
    spinner: colors.danger[600],
  },
};

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = "primary", loading = false, disabled = false }: ButtonProps) {
  const { container, text, spinner } = VARIANTS[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      className={`min-h-12 flex-row items-center justify-center rounded-full px-6 py-2 ${container} ${disabled ? "opacity-40" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={spinner} />
      ) : (
        <Text className={`text-center font-sans-semibold text-label ${text}`}>{title}</Text>
      )}
    </Pressable>
  );
}
