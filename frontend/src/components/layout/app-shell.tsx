"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { DesktopNav, MobileNavSheet, MobileNavTrigger, useMobileMenu } from "@/components/layout/site-nav";
import { UserAvatar } from "@/components/settings/user-avatar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark } from "@/components/ui/section";
import { PageLoader } from "@/components/ui/state";
import { Button } from "@/components/ui/button";
import { api, fetchCurrentUser } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

const PRIVATE_PREFIXES = ["/dashboard", "/settings", "/system-design/interview"];

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const menu = useMobileMenu(pathname);
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
      router.replace("/");
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
    if (logout.isPending || logout.isSuccess) {
      router.replace("/");
      return null;
    }
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    return null;
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <header className="sticky top-0 z-50 border-b border-steel-800 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className={cn(wide ? "mx-auto w-full max-w-[1600px] px-4" : "ia-content")}>
          <div className="flex h-12 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-5">
              <Link href={signedIn ? "/dashboard" : "/"} className="shrink-0 text-sm">
                <BrandMark compact wordmarkClassName="max-md:sr-only" />
              </Link>
              <DesktopNav pathname={pathname} />
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-[13px] text-muted-foreground">
              <ThemeToggle />
              {signedIn && me.data ? (
                <div className="hidden items-center gap-1.5 md:flex">
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
                </div>
              ) : (
                <div className="hidden items-center gap-1.5 md:flex">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Log in</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/register?next=${encodeURIComponent(pathname)}`}>Register</Link>
                  </Button>
                </div>
              )}
              <MobileNavTrigger open={menu.open} menuId={menu.menuId} onToggle={() => menu.setOpen((value) => !value)} />
            </div>
          </div>
          <MobileNavSheet
            open={menu.open}
            menuId={menu.menuId}
            signedIn={signedIn}
            user={me.data}
            nextPath={pathname}
            onClose={() => menu.setOpen(false)}
            onLogout={signedIn ? () => logout.mutate() : undefined}
            loggingOut={logout.isPending}
          />
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
