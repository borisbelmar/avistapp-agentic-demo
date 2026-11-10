import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { useController, type Control, type FieldValues, type Path } from "react-hook-form";

import colors from "@/theme/colors";

type TextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
} & Omit<TextInputProps, "value" | "onChangeText" | "onBlur" | "onFocus">;

// text-[16px] y no text-body: el lineHeight de text-body desalinea el texto en un TextInput de
// una línea en iOS (STACK §8/§11).
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  secureTextEntry,
  ...inputProps
}: TextFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const [focused, setFocused] = useState(false);
  // Solo los campos de contraseña (secureTextEntry) llevan el botón de mostrar/ocultar.
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View className="gap-1">
      <Text className="font-sans-semibold text-label text-ink">{label}</Text>
      <View className="justify-center">
        <TextInput
          /* eslint-disable react-hooks/refs -- field viene de useController (RHF): field.ref es un
             ref callback, no una ref con .current; el plugin del Compiler lo trata como ref real y
             marca el acceso a sus otras propiedades durante el render como inseguro. */
          ref={field.ref}
          value={field.value}
          onChangeText={field.onChange}
          /* eslint-enable react-hooks/refs */
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            field.onBlur();
          }}
          secureTextEntry={secureTextEntry ? hidden : undefined}
          accessibilityLabel={label}
          className={`min-h-12 rounded-xl bg-white px-4 font-sans text-[16px] text-ink ${
            secureTextEntry ? "pr-12" : ""
          } ${focused ? "border-2 border-primary-600" : "border border-line-strong"}`}
          {...inputProps}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            className="absolute right-0 h-12 w-11 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Mostrar contraseña" : "Ocultar contraseña"}
          >
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={20} color={colors.ink.muted} />
          </Pressable>
        ) : null}
      </View>
      {fieldState.error ? (
        <Text className="font-sans text-caption text-danger-600">{fieldState.error.message}</Text>
      ) : null}
    </View>
  );
}
