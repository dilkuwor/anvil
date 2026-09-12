import {
  BarChart3,
  Bell,
  Cable,
  Cloud,
  Cpu,
  Database,
  DoorOpen,
  Globe,
  HardDrive,
  Hash,
  ListTodo,
  MapPin,
  Radio,
  Scale,
  Search,
  Server,
  Shield,
  Timer,
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
  DoorOpen,
  Cable,
  Cpu,
  ListTodo,
  Search,
  MapPin,
  Hash,
  BarChart3,
  Timer,
  Bell,
};

export function KindIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Server;
  return <Icon className={className} aria-hidden />;
}
