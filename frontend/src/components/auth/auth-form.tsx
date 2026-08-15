"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-copper text-zinc-950">A</span>
            InterviewAnvil
          </div>
          <CardTitle>{mode === "login" ? "Welcome back" : "Create your bench"}</CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Sign in to continue Java practice."
              : "Register to track problems, submissions, and streaks."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              mutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {mode === "register" ? (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={mode === "register" ? 8 : 1}
                required
              />
            </div>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Working…" : mode === "login" ? "Log in" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-zinc-400">
            {mode === "login" ? (
              <>
                New here? <Link className="text-copper-light hover:underline" href="/register">Create an account</Link>
              </>
            ) : (
              <>
                Already registered? <Link className="text-copper-light hover:underline" href="/login">Log in</Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
