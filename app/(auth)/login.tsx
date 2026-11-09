import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text, View } from "react-native";
import type { z } from "zod";

import { login } from "@/auth/auth";
import { useSession } from "@/auth/SessionProvider";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { errorMessage } from "@/domain/errors";
import { loginSchema } from "@/domain/schemas";

type FormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const db = useSQLiteContext();
  const { signIn } = useSession();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const user = await login(db, values);
      await signIn(user);
      router.replace("/");
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  return (
    <AuthLayout>
      <TextField
        control={control}
        name="email"
        label="Correo"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        control={control}
        name="password"
        label="Contraseña"
        secureTextEntry
        textContentType="password"
        autoComplete="current-password"
      />
      {formError ? (
        <View className="rounded-xl bg-danger-50 px-4 py-3">
          <Text className="font-sans text-label text-danger-600">{formError}</Text>
        </View>
      ) : null}
      <Button title="Iniciar sesión" onPress={handleSubmit(onSubmit)} loading={formState.isSubmitting} />
      <Link href="/register" className="py-3 text-center font-sans text-label text-ink">
        ¿No tienes cuenta? <Text className="font-sans-semibold text-primary-700">Regístrate</Text>
      </Link>
    </AuthLayout>
  );
}
