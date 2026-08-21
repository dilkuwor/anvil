import type { Metadata } from "next";

import { SettingsForm } from "@/components/settings/settings-form";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Settings", "/settings");

export default function SettingsPage() {
  return <SettingsForm />;
}
