"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { api, ApiError, type User } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/problems", label: "Problems" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/learn", label: "Learn" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const editor = pathname.startsWith("/problems/") && pathname !== "/problems";
  const me = useQuery<User>({
    queryKey: queryKeys.me,
    queryFn: () => api.get<User>("/api/v1/auth/me"),
    retry: false,
  });

  const logout = useMutation({
    mutationFn: () => api.post("/api/v1/auth/logout"),
    onSuccess: async () => {
      queryClient.clear();
      router.push("/login");
    },
    onError: () => toast.error("Unable to log out."),
  });

  if (me.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground" aria-busy="true">
        Loading workspace…
      </div>
    );
  }

  if (me.isError) {
    if (me.error instanceof ApiError && me.error.status === 401) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return null;
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-coral">Unable to load your session.</p>
        <Button variant="secondary" onClick={() => me.refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-steel-800 bg-background/90 backdrop-blur-md">
        <div
          className={cn(
            "flex h-12 items-center justify-between",
            editor ? "mx-auto w-full max-w-[1600px] px-4" : "ia-content",
          )}
        >
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/dashboard" className="shrink-0 text-sm">
              <BrandMark compact />
            </Link>
            <nav className="flex items-center gap-0.5 overflow-x-auto" aria-label="Primary">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[13px] hover:text-foreground",
                      active ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground sm:gap-2">
            <ThemeToggle />
            <Link
              href="/settings"
              className={cn(
                "max-w-[8rem] truncate hover:text-foreground",
                pathname.startsWith("/settings") && "font-medium text-foreground",
              )}
            >
              {me.data?.username}
            </Link>
            <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main
        className={cn(
          "flex w-full flex-1 flex-col",
          pathname.startsWith("/roadmap")
            ? "h-[calc(100dvh-3rem)] min-h-0 w-full overflow-hidden py-0"
            : editor
              ? "mx-auto max-w-[1600px] px-4 py-3"
              : "ia-content py-6",
        )}
      >
        {children}
      </main>
    </div>
  );
}
