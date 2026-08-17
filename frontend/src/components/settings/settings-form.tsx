"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { UserAvatar } from "@/components/settings/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api, ApiError, fetchCurrentUser, type UpdateProfileRequest, type User } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { queryKeys } from "@/lib/queries";

export function SettingsForm() {
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchCurrentUser,
  });
  if (me.isLoading) return <CardSkeleton rows={4} />;
  if (me.isError || !me.data) {
    return <ErrorState message="Unable to load your settings." onRetry={() => me.refetch()} />;
  }

  return <ProfileEditor key={me.data.id} user={me.data} />;
}

function ProfileEditor({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [form, setForm] = useState<UpdateProfileRequest>({
    username: user.username ?? "",
    display_name: user.display_name ?? "",
    linkedin_url: user.linkedin_url ?? "",
    github_url: user.github_url ?? "",
    website_url: user.website_url ?? "",
    country: user.country ?? "",
  });

  const save = useMutation({
    mutationFn: () => api.patch<User>("/api/v1/auth/me", form),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.me, next);
      toast.success("Profile updated.");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Unable to update profile.");
    },
  });

  const upload = useMutation({
    mutationFn: (file: File) => api.putFile<User>("/api/v1/auth/me/avatar", file),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.me, next);
      setAvatarVersion((value) => value + 1);
      toast.success("Profile picture updated.");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Unable to upload picture.");
    },
  });

  const removeAvatar = useMutation({
    mutationFn: () => api.delete<User>("/api/v1/auth/me/avatar"),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.me, next);
      setAvatarVersion((value) => value + 1);
      toast.success("Profile picture removed.");
    },
    onError: () => toast.error("Unable to remove picture."),
  });

  const current = (queryClient.getQueryData<User>(queryKeys.me) ?? user) as User;

  function onPickFile(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 1_000_000) {
      toast.error("Profile pictures must be 1 MB or smaller.");
      return;
    }
    upload.mutate(file);
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <PageHeader title="Settings" description="How you appear across InterviewAnvil." />

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <SectionCard>
          <SectionTitle>Identity</SectionTitle>
          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center gap-3 sm:w-40">
              <UserAvatar user={current} size="lg" version={avatarVersion} />
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  onPickFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={upload.isPending}
                  onClick={() => fileInput.current?.click()}
                >
                  {upload.isPending ? "Uploading…" : "Upload"}
                </Button>
                {current.has_avatar ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={removeAvatar.isPending}
                    onClick={() => removeAvatar.mutate()}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              <p className="text-center text-[11px] leading-4 text-muted-foreground">JPEG, PNG, or WebP. 1 MB max.</p>
            </div>

            <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
              <Field label="Display name" hint="Shown in the header and on your profile." className="sm:col-span-2">
                <Input
                  value={form.display_name}
                  onChange={(event) => setForm({ ...form, display_name: event.target.value })}
                  maxLength={80}
                  placeholder={user.username}
                />
              </Field>
              <Field label="Username" hint="Unique handle. Letters, numbers, and underscores.">
                <Input
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  minLength={3}
                  maxLength={50}
                  pattern="^[a-zA-Z0-9_]+$"
                  required
                />
              </Field>
              <Field label="Email">
                <Input value={user.email} disabled />
              </Field>
              <Field label="Country" className="sm:col-span-2">
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
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionTitle>Links</SectionTitle>
          <p className="mt-1 text-[13px] text-muted-foreground">Optional. Used if you share your InterviewAnvil profile.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="LinkedIn" className="sm:col-span-2">
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
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>

      <LlmSettings user={current} />
    </div>
  );
}

function LlmSettings({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [provider, setProvider] = useState(user.llm_provider ?? "");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const paid = provider === "openai" || provider === "gemini" || provider === "openrouter";

  const save = useMutation({
    mutationFn: () =>
      api.patch<User>("/api/v1/auth/me/llm", {
        provider: provider || null,
        api_key: apiKey.trim() || null,
        model: paid ? model.trim() || null : undefined,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.me, next);
      setApiKey("");
      toast.success("AI provider settings saved.");
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Unable to save AI settings.");
    },
  });

  const clearKey = useMutation({
    mutationFn: () =>
      api.patch<User>("/api/v1/auth/me/llm", { provider: provider || null, clear_api_key: true }),
    onSuccess: (next) => {
      queryClient.setQueryData(queryKeys.me, next);
      setApiKey("");
      toast.success("API key removed.");
    },
    onError: () => toast.error("Unable to remove API key."),
  });

  const current = (queryClient.getQueryData<User>(queryKeys.me) ?? user) as User;
  const savedKey = (current.llm_keys ?? []).find((item) => item.provider === provider);

  useEffect(() => {
    setModel(savedKey?.model ?? "");
  }, [provider, savedKey?.model]);

  return (
    <SectionCard>
      <SectionTitle>Interview AI</SectionTitle>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Platform default uses the shared Ollama interviewer. Paid providers need your own API key. Each provider keeps
        its own key, so switching models does not erase the others.
      </p>
      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Provider">
          <select className="select-field" value={provider} onChange={(event) => setProvider(event.target.value)}>
            <option value="">Platform default</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </Field>
        {paid ? (
          <Field
            label="API key"
            hint={
              savedKey
                ? `Saved key ${savedKey.hint}. Leave blank to keep it.`
                : "Required for this provider. The full key is never shown again."
            }
          >
            <Input
              type="password"
              autoComplete="off"
              placeholder={
                savedKey
                  ? "••••••••••••"
                  : provider === "gemini"
                    ? "AIza…"
                    : provider === "openrouter"
                      ? "sk-or-…"
                      : "sk-…"
              }
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </Field>
        ) : null}
        {paid ? (
          <Field
            label="Model"
            hint="Leave blank to use the server default. OpenRouter example: nvidia/nemotron-3.5-lightning:free"
          >
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={
                provider === "openrouter"
                  ? "nvidia/nemotron-3.5-lightning:free"
                  : provider === "gemini"
                    ? "gemini-2.5-flash"
                    : "gpt-4o-mini"
              }
            />
          </Field>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          {savedKey ? (
            <Button type="button" variant="ghost" size="sm" disabled={clearKey.isPending} onClick={() => clearKey.mutate()}>
              {clearKey.isPending ? "Removing…" : "Remove key"}
            </Button>
          ) : null}
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save AI settings"}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
