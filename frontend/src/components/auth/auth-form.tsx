"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { LegalLinks } from "@/components/layout/legal-links";
import { PublicHeader } from "@/components/layout/public-header";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { api, ApiError, type User } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

type Mode = "login" | "register";

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) {
    return "/dashboard";
  }
  return raw;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const finishAuth = (user: User, method: string) => {
    trackEvent(mode === "register" ? AnalyticsEvent.SignUp : AnalyticsEvent.Login, { method });
    queryClient.setQueryData(queryKeys.me, user);
    router.push(safeNext(params.get("next")));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "register") {
        return api.post<User>("/api/v1/auth/register", { email, username, password });
      }
      return api.post<User>("/api/v1/auth/login", { username, password });
    },
    onSuccess: (user) => {
      finishAuth(user, "password");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    },
  });

  const googleMutation = useMutation({
    mutationFn: async (credential: string) =>
      api.post<User>("/api/v1/auth/google", { credential }),
    onSuccess: (user) => {
      finishAuth(user, "google");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Google sign-in failed.");
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
            {mode === "register" ? (
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={mode === "register" ? 3 : 1}
                required
              />
            </div>
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
            {mode === "register" ? (
              <p className="text-center text-[12px] leading-5 text-muted-foreground">
                By creating an account you agree to the{" "}
                <Link className="font-medium text-foreground hover:text-accent" href="/terms">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link className="font-medium text-foreground hover:text-accent" href="/privacy">
                  Privacy Policy
                </Link>
                .
              </p>
            ) : null}
          </form>
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3" aria-hidden>
              <div className="h-px flex-1 bg-steel-800" />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-steel-800" />
            </div>
            <GoogleSignInButton mode={mode} onCredential={(credential) => googleMutation.mutate(credential)} />
          </div>
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
      <footer className="border-t border-steel-800 py-3">
        <div className="flex justify-center">
          <LegalLinks />
        </div>
      </footer>
    </div>
  );
}
