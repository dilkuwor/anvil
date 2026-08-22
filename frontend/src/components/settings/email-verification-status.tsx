"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api, ApiError, type User } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

export function EmailVerificationStatus({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [sent, setSent] = useState(false);

  const resend = useMutation({
    mutationFn: () => api.post<{ ok: boolean; message: string }>("/api/v1/auth/resend-verification"),
    onSuccess: () => {
      setSent(true);
      toast.success("Verification email sent. Check your inbox.");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 429) {
        toast.error("Too many verification emails requested. Please wait a while before trying again.");
        return;
      }
      if (error instanceof ApiError && error.code === "email_already_verified") {
        // Stale local state — refresh and the row flips to Verified.
        queryClient.invalidateQueries({ queryKey: queryKeys.me });
        toast.success("Your email is already verified.");
        return;
      }
      toast.error(error instanceof ApiError ? error.message : "Unable to send the verification email.");
    },
  });

  if (user.email_verified === true) {
    return (
      <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-success" data-testid="email-status">
        <BadgeCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Verified
      </p>
    );
  }

  if (user.email_verified === undefined) {
    // Older cached user payload without the field — nothing conclusive to show.
    return null;
  }

  return (
    <div className="mt-2 space-y-1.5" data-testid="email-status">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-coral">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Email not verified
        </span>
        <Button
          type="button"
          size="sm"
          disabled={resend.isPending}
          aria-label="Resend verification email"
          onClick={() => resend.mutate()}
        >
          {resend.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
          Resend verification email
        </Button>
      </div>
      {sent ? (
        <p role="status" className="text-[12px] text-muted-foreground">
          Verification email sent. Check your inbox.
        </p>
      ) : null}
    </div>
  );
}
