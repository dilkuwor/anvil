import { Badge } from "@/components/ui/badge";

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const value = difficulty.toUpperCase();
  const variant = value === "EASY" ? "easy" : value === "HARD" ? "hard" : "medium";
  return <Badge variant={variant}>{value.charAt(0) + value.slice(1).toLowerCase()}</Badge>;
}
