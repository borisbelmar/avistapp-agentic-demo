import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";

import { register } from "@/auth/auth";
import { useSession } from "@/auth/SessionProvider";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { DomainError, errorMessage } from "@/domain/errors";
import { registerSchema } from "@/domain/schemas";

// `when` evita este chequeo si `password` o `username` ya tienen su propio error (zod omite el
// refine cuando el parseo previo falló, salvo que digamos explícitamente cuándo correrlo).
const passwords = z.object({ password: z.string(), confirmPassword: z.string() });
const formSchema = registerSchema.extend({ confirmPassword: z.string() }).refine(
  (v) => v.password === v.confirmPassword,
  {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
    when: (payload) => passwords.safeParse(payload.value).success,
  },
);

type FormValues = z.infer<typeof formSchema>;

export default function RegisterScreen() {
  const db = useSQLiteContext();
  const { signIn } = useSession();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, formState, setError } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit({ username, email, password }: FormValues) {
    setFormError(null);
    try {
      const user = await register(db, { username, email, password });
      await signIn(user);
      router.replace("/");
    } catch (error) {
      if (error instanceof DomainError && error.code === "EMAIL_TAKEN") {
        setError("email", { message: error.message });
      } else if (error instanceof DomainError && error.code === "USERNAME_TAKEN") {
        setError("username", { message: error.message });
      } else {
        setFormError(errorMessage(error));
      }
    }
  }

  return (
    <AuthLayout>
      <TextField
        control={control}
        name="username"
        label="Nombre de usuario"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
        autoComplete="username-new"
      />
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
        textContentType="newPassword"
        autoComplete="new-password"
      />
      <TextField
        control={control}
        name="confirmPassword"
        label="Confirmar contraseña"
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
      />
      {formError ? (
        <View className="rounded-xl bg-danger-50 px-4 py-3">
          <Text className="font-sans text-label text-danger-600">{formError}</Text>
        </View>
      ) : null}
      <Button title="Crear cuenta" onPress={handleSubmit(onSubmit)} loading={formState.isSubmitting} />
      <Link href="/login" dismissTo className="py-3 text-center font-sans text-label text-ink">
        ¿Ya tienes cuenta? <Text className="font-sans-semibold text-primary-700">Inicia sesión</Text>
      </Link>
    </AuthLayout>
  );
}
