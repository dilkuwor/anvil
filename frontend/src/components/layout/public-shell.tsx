"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { api, ApiError, type User } from "@/lib/api";
import { queryKeys } from "@/lib/queries";

export function PublicShell({ children }: { children: React.ReactNode }) {
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.get<User>("/api/v1/auth/me"),
    retry: false,
  });
  const signedIn = Boolean(me.data) && !(me.error instanceof ApiError && me.error.status === 401);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-steel-800 bg-background/90 backdrop-blur-md">
        <div className="ia-content flex h-12 items-center justify-between">
          <Link href={signedIn ? "/dashboard" : "/"} className="shrink-0 text-sm">
            <BrandMark compact />
          </Link>
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <ThemeToggle />
            {signedIn ? (
              <Button asChild size="sm" variant="ghost">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="ia-content flex-1 py-6">{children}</main>
    </div>
  );
}
