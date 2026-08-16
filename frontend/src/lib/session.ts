import { useQuery } from "@tanstack/react-query";

import { fetchCurrentUser } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

export type AuthPromptKind = "run" | "submit" | "mock" | "ask-ai" | "progress";

function currentPath(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export function loginHref(next?: string): string {
  return `/login?next=${encodeURIComponent(next ?? currentPath())}`;
}

export function registerHref(next?: string): string {
  return `/register?next=${encodeURIComponent(next ?? currentPath())}`;
}

export function useSession() {
  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchCurrentUser,
    retry: false,
  });
  return {
    user: query.data ?? null,
    signedIn: Boolean(query.data),
    ready: !query.isLoading,
    query,
  };
}
