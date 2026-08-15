import { Binary, BookOpen, Boxes, Coffee, Cpu, MessageSquare, Network, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  binary: Binary,
  network: Network,
  coffee: Coffee,
  cpu: Cpu,
  boxes: Boxes,
  message: MessageSquare,
  book: BookOpen,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? BookOpen;
  return <Icon className={cn("h-4 w-4", className)} aria-hidden />;
}
