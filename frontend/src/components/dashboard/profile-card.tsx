import { ExternalLink, Github, Globe, Linkedin, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "@/components/settings/user-avatar";
import { Button } from "@/components/ui/button";
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

type ProfileLink = {
  href: string;
  label: string;
  Icon: LucideIcon;
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
  const links: ProfileLink[] = [
    user.linkedin_url ? { href: user.linkedin_url, label: "LinkedIn", Icon: Linkedin } : null,
    user.github_url ? { href: user.github_url, label: "GitHub", Icon: Github } : null,
    user.website_url ? { href: user.website_url, label: "Website", Icon: Globe } : null,
  ].filter((item): item is ProfileLink => item !== null);

  return (
    <SectionCard className="relative overflow-hidden">
      <div className="flex flex-col items-center text-center">
        <div className="relative rounded-full ring-2 ring-accent/30 ring-offset-2 ring-offset-steel-900 transition-all hover:ring-accent/50 hover:scale-105">
          <UserAvatar
            user={user}
            size="xl"
            src={
              publicView && user.has_avatar
                ? `/api/v1/users/${encodeURIComponent(user.username)}/avatar`
                : undefined
            }
          />
        </div>
        <h2 className="mt-4 text-base font-bold tracking-tight text-foreground">{name}</h2>
        <span className="mt-1 inline-flex rounded-md bg-steel-800/60 px-2 py-0.5 font-mono text-xs text-muted-foreground">
          @{user.username}
        </span>
      </div>

      {user.country || (!publicView && "email" in user && user.email) ? (
        <dl className="mt-5 space-y-3 border-t border-steel-800/80 pt-4 text-[13px]">
          {!publicView && "email" in user && user.email ? <Row label="Email" value={user.email} /> : null}
          {user.country ? <Row label="Country" value={user.country} /> : null}
        </dl>
      ) : null}

      {links.length ? (
        <ul className="mt-4 flex flex-wrap justify-center gap-2 border-t border-steel-800/80 pt-4">
          {links.map((item) => {
            const Icon = item.Icon;
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-steel-700/70 bg-steel-800/80 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-all hover:border-steel-600 hover:bg-steel-700 hover:text-foreground"
                >
                  <Icon className="h-3.5 w-3.5 text-accent" />
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!publicView ? (
        <div className="mt-5 flex flex-col gap-2 border-t border-steel-800/80 pt-4">
          <Button asChild variant="outline" size="sm" className="w-full justify-center gap-1.5 text-xs">
            <Link href={`/u/${user.username}`}>
              <ExternalLink className="h-3.5 w-3.5" />
              Public profile
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/settings">
              <Settings className="h-3.5 w-3.5" />
              Edit profile
            </Link>
          </Button>
        </div>
      ) : isOwner ? (
        <div className="mt-5 border-t border-steel-800/80 pt-4">
          <Button asChild variant="outline" size="sm" className="w-full justify-center gap-1.5 text-xs">
            <Link href="/settings">
              <Settings className="h-3.5 w-3.5" />
              Edit profile
            </Link>
          </Button>
        </div>
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
