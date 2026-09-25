import type { Metadata } from "next";

import { ReminderSettings } from "@/components/study/reminder-settings";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Reminders", "/today/settings");

export default function ReminderSettingsPage() {
  return <ReminderSettings />;
}
