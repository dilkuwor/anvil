"use client";

import Link from "next/link";

import { UserAvatar } from "@/components/settings/user-avatar";
import { SectionCard } from "@/components/ui/section";
import type { User } from "@/lib/api";

export function ProfileCard({ user }: { user: User }) {
  const name = user.display_name?.trim() || user.username;
  const links = [
    user.linkedin_url ? { href: user.linkedin_url, label: "LinkedIn" } : null,
    user.github_url ? { href: user.github_url, label: "GitHub" } : null,
    user.website_url ? { href: user.website_url, label: "Website" } : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));

  return (
    <SectionCard>
      <div className="flex flex-col items-center text-center">
        <UserAvatar user={user} size="xl" />
        <h2 className="mt-4 text-base font-semibold tracking-tight">{name}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">@{user.username}</p>
      </div>

      <dl className="mt-5 space-y-3 border-t border-steel-800 pt-4 text-[13px]">
        <Row label="Email" value={user.email} />
        {user.country ? <Row label="Country" value={user.country} /> : null}
      </dl>

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

      <Link
        href="/settings"
        className="mt-5 block text-center text-[12px] text-muted-foreground hover:text-accent"
      >
        Edit profile
      </Link>
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
