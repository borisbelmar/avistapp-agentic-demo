import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions, type PermissionResponse } from "expo-camera";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { ERROR_MESSAGES } from "@/domain/errors";
import colors from "@/theme/colors";

// Textos de DESIGN §8 (Permisos; Cámara y fallas del sistema).
const CAMERA_PERMISSION_TEXT = "AvistApp necesita la cámara para fotografiar aves.";
const LOCATION_PERMISSION_TEXT = "Necesitamos tu ubicación para registrar dónde viste el ave.";
const PHOTO_FAILED = "No pudimos tomar la foto. Inténtalo de nuevo.";
const CAMERA_FAILED = "No pudimos abrir la cámara. Cierra esta pantalla e inténtalo de nuevo.";

function CloseButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      className="absolute left-4 top-14 z-10 h-11 w-11 items-center justify-center rounded-full bg-black/40"
      accessibilityRole="button"
      accessibilityLabel="Cerrar cámara"
    >
      <Ionicons name="close" size={24} color={colors.white} />
    </Pressable>
  );
}

type PermissionScreenProps = {
  text: string;
  permission: PermissionResponse;
  request: () => Promise<PermissionResponse>;
};

function PermissionScreen({ text, permission, request }: PermissionScreenProps) {
  async function onPress() {
    try {
      if (permission.canAskAgain) await request();
      else await Linking.openSettings();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <View className="flex-1 items-center justify-center gap-6 bg-paper p-4">
      <CloseButton />
      <Text className="text-center font-sans text-body text-ink">{text}</Text>
      <Button title={permission.canAskAgain ? "Permitir" : "Abrir ajustes"} onPress={onPress} />
    </View>
  );
}

export default function CaptureScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission, getCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission, getLocationPermission] =
    Location.useForegroundPermissions();
  const [cameraState, setCameraState] = useState<"starting" | "ready" | "failed">("starting");
  const [isShooting, setIsShooting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Los hooks de permisos solo leen el estado al montar: al volver de Ajustes se releen.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;
      try {
        await Promise.all([getCameraPermission(), getLocationPermission()]);
      } catch (error) {
        console.error(error);
      }
    });
    return () => subscription.remove();
  }, [getCameraPermission, getLocationPermission]);

  async function takePhoto() {
    const camera = cameraRef.current;
    if (!camera) return;
    // SG7: el instante del disparo, antes de cualquier await.
    const capturedAt = new Date().toISOString();
    setError(null);
    setIsShooting(true);
    // allSettled y no un único catch: cada falla muestra su propio mensaje (STACK §7).
    const [photo, position] = await Promise.allSettled([
      camera.takePictureAsync({ quality: 0.7, base64: true }),
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    ]);
    setIsShooting(false);
    if (photo.status === "rejected") console.error(photo.reason);
    if (position.status === "rejected") console.error(position.reason);

    if (photo.status === "rejected" || !photo.value.base64) {
      setError(PHOTO_FAILED);
      return;
    }
    if (position.status === "rejected") {
      setError(ERROR_MESSAGES.INVALID_LOCATION);
      return;
    }
    router.push({
      pathname: "/publish",
      params: {
        photoBase64: photo.value.base64,
        latitude: String(position.value.coords.latitude),
        longitude: String(position.value.coords.longitude),
        capturedAt,
      },
    });
  }

  if (!cameraPermission || !locationPermission) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <CloseButton />
        <ActivityIndicator color={colors.primary[600]} />
      </View>
    );
  }
  if (!cameraPermission.granted) {
    return (
      <PermissionScreen text={CAMERA_PERMISSION_TEXT} permission={cameraPermission} request={requestCameraPermission} />
    );
  }
  if (!locationPermission.granted) {
    return (
      <PermissionScreen
        text={LOCATION_PERMISSION_TEXT}
        permission={locationPermission}
        request={requestLocationPermission}
      />
    );
  }

  const canShoot = cameraState === "ready" && !isShooting;

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        onCameraReady={() => setCameraState("ready")}
        onMountError={(event) => {
          console.error(event.message);
          setCameraState("failed");
          setError(CAMERA_FAILED);
        }}
      />
      <CloseButton />
      <View className="absolute bottom-12 left-0 right-0 items-center gap-4 px-4">
        {isShooting ? (
          <View className="flex-row items-center gap-2 rounded-xl bg-black/40 px-3 py-2">
            <ActivityIndicator color={colors.white} />
            <Text className="shrink font-sans text-label text-white">Obteniendo ubicación…</Text>
          </View>
        ) : null}
        {error ? (
          <View className="rounded-xl bg-black/40 px-3 py-2">
            <Text className="text-center font-sans text-label text-white">{error}</Text>
          </View>
        ) : null}
        <Pressable
          onPress={takePhoto}
          disabled={!canShoot}
          accessibilityRole="button"
          accessibilityLabel="Tomar foto"
          accessibilityState={{ disabled: !canShoot, busy: cameraState === "starting" || isShooting }}
          className="h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-primary-500 bg-white"
        >
          {cameraState === "starting" ? <ActivityIndicator color={colors.primary[600]} /> : null}
        </Pressable>
      </View>
    </View>
  );
}
