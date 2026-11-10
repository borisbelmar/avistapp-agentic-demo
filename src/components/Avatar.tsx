import { Text, View } from "react-native";

export function Avatar({ username }: { username: string }) {
  return (
    <View
      className="h-9 w-9 items-center justify-center rounded-full bg-secondary-200"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text allowFontScaling={false} className="font-sans-semibold text-label text-secondary-700">
        {username.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
