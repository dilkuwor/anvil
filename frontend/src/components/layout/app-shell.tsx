"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { UserAvatar } from "@/components/settings/user-avatar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/ui/section";
import { PageLoader } from "@/components/ui/state";
import { Button } from "@/components/ui/button";
import { api, fetchCurrentUser } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

const PUBLIC_NAV = [
  { href: "/problems", label: "Problems" },
  { href: "/system-design", label: "System Design" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/learn", label: "Learn" },
  { href: "/cheatsheets", label: "Cheat Sheets" },
];

const PRIVATE_PREFIXES = ["/dashboard", "/settings", "/system-design/interview"];

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const editor = pathname.startsWith("/problems/") && !pathname.startsWith("/problems/lists");
  const designWorkspace = pathname.startsWith("/system-design/interview");
  const simulator = pathname.startsWith("/system-design/simulator");
  const wide = editor || designWorkspace || simulator;
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchCurrentUser,
    retry: false,
  });
  const signedIn = Boolean(me.data);

  const logout = useMutation({
    mutationFn: () => api.post("/api/v1/auth/logout"),
    onSuccess: async () => {
      queryClient.clear();
      router.push("/login");
    },
    onError: () => toast.error("Unable to log out."),
  });

  if (me.isLoading) {
    return <PageLoader variant="screen" />;
  }

  if (me.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-coral">Unable to load your session.</p>
        <Button variant="secondary" onClick={() => me.refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!signedIn && isPrivatePath(pathname)) {
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    return null;
  }

  const nav = PUBLIC_NAV;

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <header className="sticky top-0 z-20 border-b border-steel-800 bg-background/90 backdrop-blur-md">
        <div
          className={cn(
            "flex h-12 items-center justify-between",
            wide ? "mx-auto w-full max-w-[1600px] px-4" : "ia-content",
          )}
        >
          <div className="flex min-w-0 items-center gap-5">
            <Link href={signedIn ? "/dashboard" : "/"} className="shrink-0 text-sm">
              <BrandMark compact />
            </Link>
            <nav className="flex items-center gap-0.5 overflow-x-auto" aria-label="Primary">
              {nav.map((item) => {
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
            {signedIn && me.data ? (
              <>
                <ThemeToggle />
                <Link
                  href="/settings"
                  className={cn(
                    "inline-flex max-w-[10rem] items-center gap-2 truncate hover:text-foreground",
                    pathname.startsWith("/settings") && "font-medium text-foreground",
                  )}
                >
                  <UserAvatar user={me.data} size="sm" />
                  <span className="truncate">{me.data.display_name || me.data.username}</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={`/register?next=${encodeURIComponent(pathname)}`}>Register</Link>
                </Button>
                <ThemeToggle />
              </>
            )}
          </div>
        </div>
      </header>
      <main
        className={cn(
          "flex w-full flex-1 flex-col",
          pathname.startsWith("/roadmap") || simulator
            ? "min-h-0 w-full flex-1 overflow-hidden py-0"
            : designWorkspace
              ? "mx-auto h-[calc(100dvh-3rem)] min-h-0 w-full max-w-[1600px] overflow-hidden px-4 py-3"
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
