import { Text, View } from "react-native";

import { Button } from "./Button";

type EmptyStateProps = {
  message: string;
  actionTitle: string;
  onAction: () => void;
};

// Estado vacío y error de carga comparten formato: mensaje + acción (DESIGN §7, §7.2, §7.7).
export function EmptyState({ message, actionTitle, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-6 p-4">
      <Text className="text-center font-sans text-body text-ink-muted">{message}</Text>
      <Button title={actionTitle} onPress={onAction} />
    </View>
  );
}
