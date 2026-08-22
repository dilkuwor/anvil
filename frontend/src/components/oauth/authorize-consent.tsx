"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { ErrorState, PageLoader } from "@/components/ui/state";
import { api, ApiError, fetchCurrentUser } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

type ConsentPreview = {
  client_id: string;
  client_name: string;
  redirect_uri: string;
  scope: string;
  username: string;
};

export function AuthorizeConsent() {
  const router = useRouter();
  const params = useSearchParams();
  const qs = params.toString();
  const next = `/oauth/authorize${qs ? `?${qs}` : ""}`;

  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchCurrentUser,
    retry: false,
  });

  useEffect(() => {
    if (me.isSuccess && !me.data) {
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [me.isSuccess, me.data, next, router]);

  const preview = useQuery({
    queryKey: ["oauth-consent", qs],
    queryFn: () => api.get<ConsentPreview>(`/api/v1/oauth/consent?${qs}`),
    enabled: Boolean(me.data),
    retry: false,
  });

  const decide = useMutation({
    mutationFn: (allow: boolean) =>
      api.post<{ redirect_to: string }>("/api/v1/oauth/consent", {
        client_id: params.get("client_id") ?? "",
        redirect_uri: params.get("redirect_uri") ?? "",
        state: params.get("state") ?? "",
        scope: params.get("scope") || "mcp:read",
        code_challenge: params.get("code_challenge") ?? "",
        code_challenge_method: params.get("code_challenge_method") || "S256",
        response_type: params.get("response_type") || "code",
        allow,
      }),
    onSuccess: (body) => {
      if (body.redirect_to.startsWith("https://") || body.redirect_to.startsWith("http://")) {
        window.location.assign(body.redirect_to);
      }
    },
  });

  if (me.isLoading || (me.data && preview.isLoading)) {
    return <PageLoader variant="screen" />;
  }

  if (preview.isError) {
    return (
      <div className="flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <ErrorState
            message={preview.error instanceof ApiError ? preview.error.message : "This authorization request is invalid."}
          />
        </main>
      </div>
    );
  }

  if (!preview.data) {
    return <PageLoader variant="screen" />;
  }

  const data = preview.data;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] rounded-2xl border border-steel-800 bg-steel-900 p-6 sm:p-7">
          <h1 className="text-xl font-semibold tracking-tight">Allow {data.client_name}?</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Signed in as <span className="text-foreground">{data.username}</span>. {data.client_name} wants to read
            your AnvilPrep lessons, progress, notes, submissions, and completed interviews. It cannot run code or
            start interviews.
          </p>
          <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">{data.redirect_uri}</p>
          {decide.error ? (
            <p className="mt-3 text-sm text-coral">
              {decide.error instanceof ApiError ? decide.error.message : "Unable to continue."}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" disabled={decide.isPending} onClick={() => decide.mutate(false)}>
              Deny
            </Button>
            <Button disabled={decide.isPending} onClick={() => decide.mutate(true)}>
              Allow
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
