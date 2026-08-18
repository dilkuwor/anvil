import {
  Cloud,
  Database,
  Globe,
  HardDrive,
  Radio,
  Scale,
  Server,
  Shield,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Users,
  Globe,
  Scale,
  Cloud,
  Server,
  Zap,
  Database,
  Radio,
  HardDrive,
  Shield,
};

export function KindIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Server;
  return <Icon className={className} aria-hidden />;
}
