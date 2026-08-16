export type CheatSheetCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  section_count: number;
  estimated_minutes: number;
  href: string;
};

export type CheatSheetBlock = {
  kind: string;
  title: string;
  body: string;
  items: unknown;
};

export type CheatSheetSection = {
  slug: string;
  title: string;
  blocks: CheatSheetBlock[];
};

export type CheatSheetDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  estimated_minutes: number;
  section_count: number;
  sections: CheatSheetSection[];
};

export type CheatSheetTable = {
  headers: string[];
  rows: string[][];
};

export function asStringList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is string => typeof item === "string");
}

export function asTable(items: unknown): CheatSheetTable | null {
  if (!items || typeof items !== "object" || Array.isArray(items)) return null;
  const value = items as { headers?: unknown; rows?: unknown };
  if (!Array.isArray(value.headers) || !Array.isArray(value.rows)) return null;
  return {
    headers: value.headers.filter((item): item is string => typeof item === "string"),
    rows: value.rows
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) => row.map((cell) => String(cell))),
  };
}
