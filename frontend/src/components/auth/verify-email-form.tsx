"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

export function VerifyEmailPanel() {
  const params = useSearchParams();
  const token = (params.get("token") ?? "").trim();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const verify = useMutation({
    mutationFn: () => api.post<{ ok: boolean; message: string }>("/api/v1/auth/verify-email", { token }),
    onSuccess: () => {
      // Refresh cached user state so Settings immediately shows Verified.
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      setStatus("success");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "We couldn't verify this link.");
      setStatus("error");
    },
  });

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    setStatus("pending");
    verify.mutate();
  }, [token, verify]);

  return (
    <div className="mx-auto my-auto w-full max-w-[440px] rounded-2xl border border-steel-800 bg-steel-900 p-6 text-center sm:p-7">
      {status === "pending" ? (
        <>
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-copper" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Verifying your email…</h1>
        </>
      ) : null}

      {status === "success" ? (
        <>
          <BadgeCheck className="mx-auto h-10 w-10 text-success" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Email verified</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your email address is confirmed. You can sign in with a password or Google from now on.
          </p>
          <Button asChild className="mt-6 w-full">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </>
      ) : null}

      {status === "error" || status === "idle" ? (
        <>
          <AlertTriangle className="mx-auto h-10 w-10 text-coral" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            {token ? "We couldn't verify this link" : "This link is missing its verification token"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {error ?? "Verification links expire after 24 hours and can only be used once."} You can request a fresh
            link from your settings.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="secondary" asChild>
              <Link href="/settings">Open settings</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
