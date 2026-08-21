import type { Metadata } from "next";

import { NotesIndex } from "@/components/notes/notes-index";
import { noIndexMeta } from "@/lib/seo";

export const metadata: Metadata = noIndexMeta("Notes", "/notes");

export default function NotesPage() {
  return <NotesIndex />;
}
