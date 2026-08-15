"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api, ApiError, type UpdateProfileRequest, type User } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { queryKeys } from "@/lib/queries";

export function SettingsForm() {
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.get<User>("/api/v1/auth/me"),
  });
  if (me.isLoading) return <CardSkeleton rows={4} />;
  if (me.isError || !me.data) {
    return <ErrorState message="Unable to load your settings." onRetry={() => me.refetch()} />;
  }

  return <ProfileEditor key={me.data.id} user={me.data} />;
}

function ProfileEditor({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UpdateProfileRequest>({
    username: user.username ?? "",
    linkedin_url: user.linkedin_url ?? "",
    github_url: user.github_url ?? "",
    website_url: user.website_url ?? "",
    country: user.country ?? "",
  });

  const save = useMutation({
    mutationFn: () => api.patch<User>("/api/v1/auth/me", form),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.me, user);
      toast.success("Profile updated.");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Unable to update profile.");
    },
  });

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <PageHeader title="Settings" description="Update how you appear on InterviewAnvil." />
      <SectionCard>
        <SectionTitle>Profile</SectionTitle>
        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Email">
            <Input value={user.email} disabled />
          </Field>
          <Field label="Username">
            <Input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              minLength={3}
              maxLength={50}
              pattern="^[a-zA-Z0-9_]+$"
              required
            />
          </Field>
          <Field label="LinkedIn profile">
            <Input
              type="url"
              placeholder="https://www.linkedin.com/in/you"
              value={form.linkedin_url}
              onChange={(event) => setForm({ ...form, linkedin_url: event.target.value })}
            />
          </Field>
          <Field label="GitHub">
            <Input
              type="url"
              placeholder="https://github.com/you"
              value={form.github_url}
              onChange={(event) => setForm({ ...form, github_url: event.target.value })}
            />
          </Field>
          <Field label="Website">
            <Input
              type="url"
              placeholder="https://your-site.com"
              value={form.website_url}
              onChange={(event) => setForm({ ...form, website_url: event.target.value })}
            />
          </Field>
          <Field label="Current country">
            <select
              className="select-field"
              value={form.country}
              onChange={(event) => setForm({ ...form, country: event.target.value })}
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
