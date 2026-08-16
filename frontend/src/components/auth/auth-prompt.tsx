"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { loginHref, registerHref, type AuthPromptKind } from "@/lib/session";

const COPY: Record<AuthPromptKind, { title: string; body: string }> = {
  run: {
    title: "Sign in to run your solution",
    body: "Create an account to run code, submit solutions, and track your interview progress.",
  },
  submit: {
    title: "Sign in to submit your solution",
    body: "Create an account to run code, submit solutions, and track your interview progress.",
  },
  mock: {
    title: "Sign in to start your mock interview",
    body: "Practice with an AI interviewer and receive detailed feedback on your performance.",
  },
  "ask-ai": {
    title: "Sign in to continue",
    body: "Ask AI uses a personalized tutor. Sign in to chat about this lesson.",
  },
  progress: {
    title: "Sign in to track progress",
    body: "Create an account to save lesson progress and pick up where you left off.",
  },
  lists: {
    title: "Sign in to save lists",
    body: "Create an account to organize problems into custom lists.",
  },
};

export function AuthPrompt({
  kind,
  onClose,
}: {
  kind: AuthPromptKind;
  onClose: () => void;
}) {
  const copy = COPY[kind];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-background/70" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-prompt-title"
        className="relative w-full max-w-md rounded-2xl border border-steel-800 bg-steel-900 p-6 shadow-lg"
      >
        <h2 id="auth-prompt-title" className="text-base font-semibold tracking-tight">
          {copy.title}
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{copy.body}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={loginHref()}>Log in</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href={registerHref()}>Create account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
