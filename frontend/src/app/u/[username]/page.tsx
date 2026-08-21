import type { Metadata } from "next";

import { PublicProgressBoard } from "@/components/dashboard/public-progress-board";
import { PublicShell } from "@/components/layout/public-shell";
import { fetchPublicJson } from "@/lib/public-api";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchPublicJson<{ user?: { display_name?: string; username: string } }>(
    `/api/v1/users/${encodeURIComponent(username)}`,
  );
  if (!profile?.user) {
    return pageMeta({
      title: "Profile",
      description: "Public interview-prep profile on Anvil.",
      path: `/u/${username}`,
      noIndex: true,
    });
  }
  const name = profile.user.display_name || profile.user.username;
  return pageMeta({
    title: `${name} on Anvil`,
    description: `Public interview-prep progress for ${name} on Anvil.`,
    path: `/u/${username}`,
  });
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return (
    <PublicShell>
      <PublicProgressBoard username={username} />
    </PublicShell>
  );
}
