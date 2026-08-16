"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError, type User } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "register") {
        return api.post<User>("/api/v1/auth/register", { email, username, password });
      }
      return api.post<User>("/api/v1/auth/login", { email, password });
    },
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
      router.push(params.get("next") || "/dashboard");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] rounded-2xl border border-steel-800 bg-steel-900 p-6 sm:p-7">
          <h1 className="text-xl font-semibold tracking-tight">
            {mode === "login" ? "Log in" : "Create an account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "login"
              ? "Continue your Java practice."
              : "Track problems, submissions, and streaks."}
          </p>
          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              mutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode === "register" ? (
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  required
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={mode === "register" ? 8 : 1}
                required
              />
            </div>
            {error ? <p className="text-sm text-coral">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Working…" : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                New here?{" "}
                <Link className="font-medium text-accent hover:text-accent-light" href="/register">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already registered?{" "}
                <Link className="font-medium text-accent hover:text-accent-light" href="/login">
                  Log in
                </Link>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
