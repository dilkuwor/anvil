import { PublicProgressBoard } from "@/components/dashboard/public-progress-board";
import { PublicShell } from "@/components/layout/public-shell";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return (
    <PublicShell>
      <PublicProgressBoard username={username} />
    </PublicShell>
  );
}
