"use client";

import { cn } from "@/lib/utils";

export function UserAvatar({
  user,
  size = "md",
  version,
  className,
}: {
  user: { id: string; username: string; display_name?: string | null; has_avatar?: boolean };
  size?: "sm" | "md" | "lg" | "xl";
  version?: number | string;
  className?: string;
}) {
  const label = (user.display_name || user.username).trim();
  const initial = (label.charAt(0) || "?").toUpperCase();
  const dim =
    size === "xl"
      ? "h-24 w-24 text-2xl"
      : size === "lg"
        ? "h-20 w-20 text-xl"
        : size === "sm"
          ? "h-6 w-6 text-[10px]"
          : "h-10 w-10 text-sm";
  if (user.has_avatar) {
    const src = `/api/v1/auth/me/avatar?u=${user.id}${version != null ? `&v=${version}` : ""}`;
    return (
      // Profile bytes come from the authenticated API, not a static image host.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={cn("rounded-full object-cover", dim, className)} />
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-steel-800 font-medium text-foreground",
        dim,
        className,
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}
