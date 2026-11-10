import { Alert } from "react-native";

// Confirmación "Eliminar publicación" (DESIGN §8): "Cancelar" a la izquierda y la acción destructiva a la derecha.
export function confirmDeleteSighting(onConfirm: () => void) {
  Alert.alert("¿Eliminar publicación?", "Se borrarán la foto y sus votos. No se puede deshacer.", [
    { text: "Cancelar", style: "cancel" },
    { text: "Eliminar", style: "destructive", onPress: onConfirm },
  ]);
}
