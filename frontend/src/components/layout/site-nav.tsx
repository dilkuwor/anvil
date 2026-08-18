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

export function useMobileMenu(pathname: string) {
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const menuId = useId();

  if (menuPath !== pathname) {
    setMenuPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onViewportChange(event: MediaQueryListEvent) {
      if (event.matches) setOpen(false);
    }
    const desktop = window.matchMedia("(min-width: 768px)");
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onViewportChange);
    return () => {
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onViewportChange);
    };
  }, [open]);

  return { open, setOpen, menuId };
}

export function MobileNavTrigger({
  open,
  menuId,
  onToggle,
}: {
  open: boolean;
  menuId: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-md text-muted-foreground [-webkit-tap-highlight-color:transparent] hover:bg-steel-800 hover:text-foreground md:hidden"
      aria-expanded={open}
      aria-controls={menuId}
      aria-label={open ? "Close menu" : "Open menu"}
      onClick={onToggle}
    >
      {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );
}

export function MobileNavSheet({
  open,
  menuId,
  signedIn,
  user,
  nextPath,
  onClose,
  onLogout,
  loggingOut,
}: {
  open: boolean;
  menuId: string;
  signedIn: boolean;
  user?: SiteNavUser | null;
  nextPath: string;
  onClose: () => void;
  onLogout?: () => void;
  loggingOut?: boolean;
}) {
  const pathname = usePathname();
  if (!open) return null;

  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(nextPath)}`;

  return (
    <div id={menuId} className="border-t border-steel-800 bg-background px-3 py-3 md:hidden">
      <nav className="flex flex-col" aria-label="Primary">
        {SITE_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            pathname={pathname}
            onClick={onClose}
            className="px-3 py-2.5 text-sm"
          />
        ))}
      </nav>
      <div className="mt-2 flex flex-col gap-2 border-t border-steel-800 pt-3">
        {signedIn && user ? (
          <>
            <Link
              href="/settings"
              onClick={onClose}
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
              <Link href={loginHref} onClick={onClose}>
                Log in
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={registerHref} onClick={onClose}>
                Register
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
