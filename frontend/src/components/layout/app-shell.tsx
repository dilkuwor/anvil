"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api, ApiError, type User } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/problems", label: "Problems" },
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
      <div className="flex min-h-screen items-center justify-center text-zinc-500" aria-busy="true">
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
        <p className="text-coral">Unable to load your session.</p>
        <Button variant="secondary" onClick={() => me.refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-steel-800 bg-steel-950/95">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-zinc-950">A</span>
              InterviewAnvil
            </Link>
            <nav className="flex items-center gap-1" aria-label="Primary">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-steel-800 hover:text-zinc-100",
                    pathname.startsWith(item.href) && "bg-steel-800 text-zinc-100",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span className="hidden sm:inline">{me.data?.username}</span>
            <Button variant="ghost" size="sm" onClick={() => logout.mutate()}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main
        className={cn(
          "mx-auto flex w-full flex-1 flex-col px-4",
          editor ? "max-w-[1600px] py-3" : "max-w-7xl py-6",
        )}
      >
        {children}
      </main>
    </div>
  );
}
