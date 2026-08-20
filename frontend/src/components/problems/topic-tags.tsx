import type { Tag } from "@/lib/api";
import { cn } from "@/lib/utils";

export function TopicTags({
  tags,
  limit = 3,
  onSelect,
}: {
  tags: Tag[];
  limit?: number;
  onSelect?: (slug: string) => void;
}) {
  if (!tags.length) return <span className="text-muted-foreground">—</span>;
  const visible = tags.slice(0, limit);
  const extra = tags.length - visible.length;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((tag) => {
        const className = "rounded-md bg-steel-950 px-1.5 py-0.5 text-[11px] leading-4 text-muted-foreground";
        if (!onSelect) {
          return (
            <span key={tag.id} className={className}>
              {tag.name}
            </span>
          );
        }
        return (
          <button
            key={tag.id}
            type="button"
            className={cn(className, "hover:bg-steel-800 hover:text-foreground")}
            onClick={() => onSelect(tag.slug)}
          >
            {tag.name}
          </button>
        );
      })}
      {extra > 0 ? <span className="text-[11px] text-muted-foreground">+{extra}</span> : null}
    </div>
  );
}
