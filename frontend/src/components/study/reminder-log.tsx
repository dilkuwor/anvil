"use client";

import { AlertTriangle, BellRing, CheckCircle2, ChevronDown, CircleSlash, FlaskConical, XCircle } from "lucide-react";
import { useState } from "react";

import { CardHeader, SectionCard } from "@/components/ui/section";
import { useReminderStatus, type ReminderDelivery } from "@/lib/study";
import { cn } from "@/lib/utils";

/**
 * What the reminder service actually did: the next send, whether the service is alive, and
 * the last five deliveries, each expandable to the tasks it listed or the error it hit.
 */
export function ReminderLog() {
  const status = useReminderStatus();
  const data = status.data;
  if (!data) return null;

  const service = data.service;
  const serviceText = !data.email_configured
    ? "email not set up"
    : service.healthy
      ? `service ok · checked ${agoLabel(service.last_run_at)}`
      : service.last_run_at
        ? `service quiet · last check ${agoLabel(service.last_run_at)}`
        : "service has not run yet";

  return (
    <SectionCard className="p-4">
      <CardHeader
        icon={BellRing}
        title="Reminder log"
        meta={serviceText}
        action={
          !data.email_configured || service.healthy ? undefined : (
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Reminder service is not running" />
          )
        }
      />

      <p className="text-[13px] text-foreground">
        {data.enabled ? (
          data.next_at ? (
            <>
              Next reminder <span className="font-semibold">{nextLabel(data.next_at, data.timezone)}</span>
              <span className="text-muted-foreground"> · {data.timezone}</span>
            </>
          ) : (
            <span className="text-muted-foreground">No day is selected, so nothing is scheduled.</span>
          )
        ) : (
          <span className="text-muted-foreground">Reminders are off.</span>
        )}
      </p>
      {!service.healthy && data.email_configured ? (
        <p className="mt-1 text-[12px] text-amber-600 dark:text-amber-400">
          The reminder service has not checked in recently, so nothing will be sent until the API is running again.
        </p>
      ) : null}

      <div className="mt-3 border-t border-steel-800/80 pt-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Last deliveries</p>
        {data.history.length ? (
          <ul className="mt-1.5 divide-y divide-steel-800/70">
            {data.history.map((row) => (
              <DeliveryRow key={row.id} row={row} />
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-muted-foreground">Nothing yet. The first attempt shows up here, sent or not.</p>
        )}
      </div>
    </SectionCard>
  );
}

function DeliveryRow({ row }: { row: ReminderDelivery }) {
  const [open, setOpen] = useState(false);
  const canExpand = row.task_titles.length > 0 || Boolean(row.error);
  const look = LOOK[row.status];
  const Icon = row.kind === "test" ? FlaskConical : look.Icon;
  return (
    <li>
      <button
        type="button"
        onClick={() => canExpand && setOpen((value) => !value)}
        aria-expanded={canExpand ? open : undefined}
        className={cn("flex w-full items-center gap-2.5 py-2 text-left", canExpand ? "cursor-pointer" : "cursor-default")}
      >
        <span className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full", look.bg)}>
          <Icon className={cn("h-3.5 w-3.5", look.fg)} aria-hidden />
        </span>
        <span className="w-[5.5rem] shrink-0 text-[12.5px] font-medium tabular-nums text-foreground">{dayLabel(row.day)}</span>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", look.bg, look.fg)}>
          {row.kind === "test" ? "Test" : look.label}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">{summary(row)}</span>
        {canExpand ? (
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
        ) : null}
      </button>
      {open ? (
        <div className="mb-2 ml-[2.1rem] rounded-lg border border-steel-800/80 bg-steel-950/40 px-3 py-2 text-[12.5px]">
          {row.task_titles.length ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">In the email</p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-foreground/90">
                {row.task_titles.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ol>
            </>
          ) : null}
          {row.error ? (
            <p className={cn("break-words text-coral", row.task_titles.length && "mt-2")}>
              <span className="font-semibold">Error:</span> {row.error}
            </p>
          ) : null}
          {row.created_at ? (
            <p className="mt-1.5 text-[11px] text-muted-foreground">Logged {new Date(row.created_at).toLocaleString()}</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

const LOOK = {
  sent: { label: "Sent", Icon: CheckCircle2, bg: "bg-emerald-500/10", fg: "text-emerald-500" },
  skipped: { label: "Skipped", Icon: CircleSlash, bg: "bg-steel-800", fg: "text-muted-foreground" },
  failed: { label: "Failed", Icon: XCircle, bg: "bg-coral/10", fg: "text-coral" },
} as const;

function summary(row: ReminderDelivery): string {
  if (row.status === "sent") {
    return row.task_count
      ? `${row.task_count} task${row.task_count === 1 ? "" : "s"} · ${row.task_titles.slice(0, 2).join(", ")}`
      : "sent";
  }
  if (row.status === "skipped") {
    if (row.reason === "nothing_due") return "nothing was due that day";
    if (row.reason === "no_email") return "no email address on the account";
    return "skipped";
  }
  return row.reason === "provider_error" ? "the email provider rejected it" : "something went wrong";
}

function dayLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function nextLabel(iso: string, zone: string): string {
  const when = new Date(iso);
  const now = new Date();
  if (Number.isNaN(when.getTime())) return iso;
  if (when.getTime() - now.getTime() < 60_000) return "within a few minutes";
  const time = when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", timeZone: zone });
  const dayDiff = Math.round((startOfDay(when, zone) - startOfDay(now, zone)) / 86_400_000);
  if (dayDiff === 0) return `today at ${time}`;
  if (dayDiff === 1) return `tomorrow at ${time}`;
  return `${when.toLocaleDateString(undefined, { weekday: "long", timeZone: zone })} at ${time}`;
}

function startOfDay(date: Date, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return new Date(`${parts}T12:00:00`).getTime();
}

function agoLabel(iso: string | null): string {
  if (!iso) return "never";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}
