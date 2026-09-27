import { BuddyProvider } from "@/components/buddy/buddy-provider";
import { AppShell } from "@/components/layout/app-shell";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BuddyProvider>
      <AppShell>{children}</AppShell>
    </BuddyProvider>
  );
}
