"use client";

import Link from "next/link";

import { UserAvatar } from "@/components/settings/user-avatar";
import { SectionCard } from "@/components/ui/section";
import type { User } from "@/lib/api";

export type PublicProfileUser = {
  username: string;
  display_name?: string | null;
  country?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  website_url?: string | null;
  has_avatar?: boolean;
};

export function ProfileCard({
  user,
  publicView = false,
  isOwner = false,
}: {
  user: User | PublicProfileUser;
  publicView?: boolean;
  isOwner?: boolean;
}) {
  const name = user.display_name?.trim() || user.username;
  const links = [
    user.linkedin_url ? { href: user.linkedin_url, label: "LinkedIn" } : null,
    user.github_url ? { href: user.github_url, label: "GitHub" } : null,
    user.website_url ? { href: user.website_url, label: "Website" } : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));

  return (
    <SectionCard>
      <div className="flex flex-col items-center text-center">
        <UserAvatar
          user={user}
          size="xl"
          src={
            publicView && user.has_avatar
              ? `/api/v1/users/${encodeURIComponent(user.username)}/avatar`
              : undefined
          }
        />
        <h2 className="mt-4 text-base font-semibold tracking-tight">{name}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">@{user.username}</p>
      </div>

      {user.country || (!publicView && "email" in user && user.email) ? (
        <dl className="mt-5 space-y-3 border-t border-steel-800 pt-4 text-[13px]">
          {!publicView && "email" in user && user.email ? <Row label="Email" value={user.email} /> : null}
          {user.country ? <Row label="Country" value={user.country} /> : null}
        </dl>
      ) : null}

      {links.length ? (
        <ul className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[13px]">
          {links.map((item) => (
            <li key={item.href}>
              <a href={item.href} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-light">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {!publicView ? (
        <div className="mt-5 space-y-2 text-center text-[12px]">
          <Link href={`/u/${user.username}`} className="block text-muted-foreground hover:text-accent">
            Public profile
          </Link>
          <Link href="/settings" className="block text-muted-foreground hover:text-accent">
            Edit profile
          </Link>
        </div>
      ) : isOwner ? (
        <Link href="/settings" className="mt-5 block text-center text-[12px] text-muted-foreground hover:text-accent">
          Edit profile
        </Link>
      ) : null}
    </SectionCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-all">{value}</dd>
    </div>
  );
}
