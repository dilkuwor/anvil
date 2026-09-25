"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api, ApiError } from "@/lib/api";
import { browserTimezone, useSaveStudySettings, useStudySettings, type StudySettings } from "@/lib/study";
import { cn } from "@/lib/utils";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function weeksAway(iso: string): string {
  const target = new Date(`${iso}T12:00:00`).getTime();
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const days = Math.round((target - now.getTime()) / 86_400_000);
  if (Number.isNaN(days)) return "";
  if (days < 0) return "already passed";
  if (days === 0) return "today";
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} away`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} away`;
}

export function ReminderSettings() {
  const settings = useStudySettings();
  if (settings.isLoading) {
    return (
      <main className="ia-content py-6">
        <div className="mx-auto max-w-2xl">
          <CardSkeleton rows={5} />
        </div>
      </main>
    );
  }
  if (settings.isError || !settings.data) {
    const message = settings.error instanceof ApiError ? settings.error.message : "Unable to load settings.";
    return (
      <main className="ia-content py-6">
        <div className="mx-auto max-w-2xl">
          <ErrorState message={message} onRetry={() => settings.refetch()} />
        </div>
      </main>
    );
  }
  return <Editor key={settings.data.timezone + settings.data.reminder_time} initial={settings.data} />;
}

function Editor({ initial }: { initial: StudySettings }) {
  const save = useSaveStudySettings();
  const [form, setForm] = useState({
    reminders_enabled: initial.reminders_enabled,
    reminder_time: initial.reminder_time,
    reminder_days: initial.reminder_days,
    reminder_email: initial.reminder_email,
    interview_date: initial.interview_date ?? "",
  });
  const [testing, setTesting] = useState(false);

  function toggleDay(day: number) {
    setForm((prev) => ({
      ...prev,
      reminder_days: prev.reminder_days.includes(day)
        ? prev.reminder_days.filter((d) => d !== day)
        : [...prev.reminder_days, day].sort(),
    }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    save.mutate(
      {
        reminders_enabled: form.reminders_enabled,
        reminder_time: form.reminder_time,
        reminder_days: form.reminder_days,
        reminder_email: form.reminder_email,
        timezone: browserTimezone(),
        ...(form.interview_date ? { interview_date: form.interview_date } : { clear_interview_date: true }),
      },
      {
        onSuccess: () => toast.success("Saved."),
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "Unable to save."),
      },
    );
  }

  async function sendTest() {
    setTesting(true);
    try {
      await api.post("/api/v1/study/settings/test-email");
      toast.success("Test email sent.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Unable to send a test email.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <main className="ia-content py-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <Link href="/today" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Today
        </Link>
        <PageHeader
          title="Reminders"
          description='One nudge a day, only when something is due. Never a "you missed" message.'
        />

        <form onSubmit={submit}>
          <SectionCard className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="enabled" className="text-[15px]">
                Reminders on
              </Label>
              <input
                id="enabled"
                type="checkbox"
                checked={form.reminders_enabled}
                onChange={(event) => setForm({ ...form, reminders_enabled: event.target.checked })}
                className="h-5 w-5 accent-teal"
              />
            </div>
            <div className="h-px bg-steel-800" />

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={form.reminder_time}
                onChange={(event) => setForm({ ...form, reminder_time: event.target.value })}
                className="w-36"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Days</span>
              <div className="flex gap-1.5" role="group" aria-label="Reminder days">
                {DAYS.map((label, day) => {
                  const on = form.reminder_days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      aria-pressed={on}
                      aria-label={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day]}
                      className={cn(
                        "h-10 w-10 rounded-full border text-[13px] font-semibold transition-colors",
                        on ? "border-teal bg-teal/15 text-teal" : "border-steel-700 bg-steel-900 text-muted-foreground",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Send it by</span>
              <label className="flex items-center gap-2.5 text-[14px]">
                <input
                  type="checkbox"
                  checked={form.reminder_email}
                  onChange={(event) => setForm({ ...form, reminder_email: event.target.checked })}
                  className="h-[18px] w-[18px] accent-teal"
                />
                Email
                {!initial.email_configured ? (
                  <span className="text-[12px] text-muted-foreground">(email is not set up on this server yet)</span>
                ) : null}
              </label>
              <label className="flex items-center gap-2.5 text-[14px] text-muted-foreground">
                <input type="checkbox" checked disabled className="h-[18px] w-[18px] accent-teal" />
                Count on the Today link, always on
              </label>
            </div>

            <div className="h-px bg-steel-800" />

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="interview">Interview date</Label>
                {form.interview_date ? (
                  <span className="text-[12px] text-muted-foreground">{weeksAway(form.interview_date)}</span>
                ) : null}
              </div>
              <Input
                id="interview"
                type="date"
                value={form.interview_date}
                onChange={(event) => setForm({ ...form, interview_date: event.target.value })}
                className="w-44"
              />
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              Used to spread the units over the weeks you have. Missed days move later on their own. Times use your
              browser&apos;s time zone ({browserTimezone()}).
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="secondary" onClick={sendTest} disabled={testing || !initial.email_configured}>
                {testing ? "Sending…" : "Send me a test email"}
              </Button>
            </div>
          </SectionCard>
        </form>
      </div>
    </main>
  );
}
