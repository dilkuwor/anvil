"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { UserAvatar } from "@/components/settings/user-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const SITE_NAV = [
  { href: "/problems", label: "Problems" },
  { href: "/system-design", label: "System Design" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/learn", label: "Learn" },
  { href: "/cheatsheets", label: "Cheat Sheets" },
];

export type SiteNavUser = {
  id?: string;
  username: string;
  display_name?: string | null;
  has_avatar?: boolean;
};

function NavLink({
  href,
  label,
  pathname,
  onClick,
  className,
}: {
  href: string;
  label: string;
  pathname: string;
  onClick?: () => void;
  className?: string;
}) {
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-[13px] hover:text-foreground",
        active ? "font-medium text-foreground" : "text-muted-foreground",
        className,
      )}
    >
      {label}
    </Link>
  );
}

export function DesktopNav({ pathname }: { pathname: string }) {
  return (
    <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
      {SITE_NAV.map((item) => (
        <NavLink key={item.href} href={item.href} label={item.label} pathname={pathname} />
      ))}
    </nav>
  );
}

export function MobileNav({
  signedIn,
  user,
  nextPath,
  onLogout,
  loggingOut,
}: {
  signedIn: boolean;
  user?: SiteNavUser | null;
  nextPath: string;
  onLogout?: () => void;
  loggingOut?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const menuId = useId();

  if (menuPath !== pathname) {
    setMenuPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(nextPath)}`;

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-steel-800 hover:text-foreground"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-x-0 bottom-0 top-[calc(3rem+env(safe-area-inset-top))] z-30 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            className="fixed inset-x-0 top-[calc(3rem+env(safe-area-inset-top))] z-40 max-h-[calc(100dvh-3rem-env(safe-area-inset-top))] overflow-y-auto border-b border-steel-800 bg-background px-3 py-3 shadow-lg"
          >
            <nav className="flex flex-col" aria-label="Primary">
              {SITE_NAV.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  pathname={pathname}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm"
                />
              ))}
            </nav>
            <div className="mt-2 flex flex-col gap-2 border-t border-steel-800 pt-3">
              {signedIn && user ? (
                <>
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-steel-800",
                      pathname.startsWith("/settings") ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <UserAvatar user={user} size="sm" />
                    <span className="truncate">{user.display_name || user.username}</span>
                  </Link>
                  {onLogout ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="justify-center"
                      disabled={loggingOut}
                      onClick={onLogout}
                    >
                      {loggingOut ? "Logging out…" : "Log out"}
                    </Button>
                  ) : null}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link href={loginHref} onClick={() => setOpen(false)}>
                      Log in
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={registerHref} onClick={() => setOpen(false)}>
                      Register
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
