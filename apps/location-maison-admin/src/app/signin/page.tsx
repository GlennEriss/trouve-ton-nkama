"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@trouve-ton-nkama/ui/button";
import { Card, CardContent, CardHeader } from "@trouve-ton-nkama/ui/card";
import { Input } from "@trouve-ton-nkama/ui/input";
import { getClientAuth } from "@/lib/firebase/firebase-client";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    setError(null);

    try {
      const clientAuth = getClientAuth();
      const credential = await signInWithEmailAndPassword(
        clientAuth,
        values.email,
        values.password,
      );

      const idToken = await credential.user.getIdToken(true);

      const response = await fetch("/api/admin/v1/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? "Connexion impossible.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Connexion impossible. Vérifiez vos identifiants et votre accès administrateur.");
    } finally {
      setPending(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-foreground">
            <LogIn className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Connexion administrateur</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Connectez-vous avec un compte présent dans la collection `admin_users`.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" {...form.register("email")} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Mot de passe</label>
              <Input type="password" {...form.register("password")} />
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}
            <Button className="w-full" type="submit" disabled={pending}>
              {pending ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
