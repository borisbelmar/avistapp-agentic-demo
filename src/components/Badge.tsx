import { Text, View } from "react-native";

type Variant = "muted" | "secondary";

const VARIANTS: Record<Variant, { container: string; text: string }> = {
  muted: { container: "bg-line", text: "text-ink-muted" }, // "Oculta"
  secondary: { container: "bg-secondary-100", text: "text-secondary-700" }, // ADMIN
};

type BadgeProps = {
  label: string;
  variant?: Variant;
};

// Insignias "Oculta" y ADMIN (DESIGN §11).
export function Badge({ label, variant = "muted" }: BadgeProps) {
  const { container, text } = VARIANTS[variant];

  return (
    <View className={`rounded-full px-3 py-1 ${container}`}>
      <Text className={`font-sans-semibold text-caption ${text}`}>{label}</Text>
    </View>
  );
}
