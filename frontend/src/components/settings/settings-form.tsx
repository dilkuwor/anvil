"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, Loader2, PlugZap, Plus, Save, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { EmailVerificationStatus } from "@/components/settings/email-verification-status";
import { UserAvatar } from "@/components/settings/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionCard, SectionTitle } from "@/components/ui/section";
import { CardSkeleton, ErrorState } from "@/components/ui/state";
import { api, ApiError, fetchCurrentUser, type LlmProbe, type UpdateProfileRequest, type User } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { queryKeys } from "@/lib/queries";

export function SettingsForm() {
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: fetchCurrentUser,
    // Email verification can flip while the user is away (clicking the link
    // in their inbox), so always revalidate when this page mounts.
    refetchOnMount: "always",
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
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title="Settings" description="How you appear across InterviewAnvil." />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <SectionCard className="p-0">
          <PanelHeader title="Profile" body="Name, photo, and public profile details." />
          <div className="space-y-8 px-5 py-5">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-3 sm:w-48">
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
                <div className="flex flex-nowrap items-center justify-center gap-1.5">
                  <IconAction
                    text="Upload"
                    label="Upload photo"
                    pending={upload.isPending}
                    variant="secondary"
                    onClick={() => fileInput.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </IconAction>
                  {current.has_avatar ? (
                    <IconAction
                      text="Delete"
                      label="Remove photo"
                      pending={removeAvatar.isPending}
                      variant="ghost"
                      onClick={() => removeAvatar.mutate()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconAction>
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
                  <EmailVerificationStatus user={current} />
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

            <div className="border-t border-steel-800 pt-6">
              <p className="text-[13px] font-medium">Profile links</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Optional. Shown if you share your public profile.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
            </div>
          </div>
          <PanelFooter>
            <IconAction text="Save" label="Save profile" pending={save.isPending} type="submit">
              <Save className="h-3.5 w-3.5" />
            </IconAction>
          </PanelFooter>
        </SectionCard>
      </form>

      <LlmSettings user={current} />
      <McpSettings />
    </div>
  );
}

type McpToken = {
  id: string;
  name: string;
  token_prefix: string;
  scopes: string;
  last_used_at: string | null;
  created_at: string;
};

type McpTokenCreated = McpToken & { token: string };

type McpAccess = {
  id: string;
  method: string;
  name: string;
  status: string;
  token_prefix: string | null;
  created_at: string;
};

function siteOrigin() {
  if (typeof window === "undefined") return "https://anvilprep.dev";
  return window.location.origin;
}

function mcpEndpoint() {
  return `${siteOrigin()}/mcp`;
}

type OAuthClient = {
  id: string;
  client_id: string;
  name: string;
  token_endpoint_auth_method: string;
  allow_any_https_redirect: boolean;
  redirect_uris: string[];
  scopes: string;
  created_at: string;
};

function McpSettings() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("ChatGPT");
  const [created, setCreated] = useState<McpTokenCreated | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const tokens = useQuery({
    queryKey: queryKeys.mcpTokens,
    queryFn: () => api.get<McpToken[]>("/api/v1/mcp/tokens"),
  });
  const access = useQuery({
    queryKey: queryKeys.mcpAccess,
    queryFn: () => api.get<McpAccess[]>("/api/v1/mcp/access"),
  });
  const create = useMutation({
    mutationFn: () => api.post<McpTokenCreated>("/api/v1/mcp/tokens", { name: name.trim() || "MCP token" }),
    onSuccess: (row) => {
      setCreated(row);
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpTokens });
      toast.success("MCP token created. Copy it now — it will not be shown again.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Unable to create token."),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/mcp/tokens/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpTokens });
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpAccess });
      toast.success("MCP token revoked.");
    },
    onError: () => toast.error("Unable to revoke token."),
  });

  const oauthClients = useQuery({
    queryKey: queryKeys.oauthClients,
    queryFn: () => api.get<OAuthClient[]>("/api/v1/oauth/clients"),
  });
  const createOauth = useMutation({
    mutationFn: () =>
      api.post<OAuthClient>("/api/v1/oauth/clients", { name: "Grok", allow_any_https_redirect: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.oauthClients });
      toast.success("OAuth client created. Copy the Client ID into Grok.");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Unable to create OAuth client."),
  });
  const revokeOauth = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/oauth/clients/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.oauthClients });
      toast.success("OAuth client revoked.");
    },
    onError: () => toast.error("Unable to revoke OAuth client."),
  });

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Unable to copy.");
    }
  }

  const endpoint = mcpEndpoint();

  return (
    <SectionCard className="p-0">
      <PanelHeader
        title="MCP (ChatGPT / Grok)"
        body="Grok's Custom Connector needs OAuth (PKCE). Create a client below and paste the values into Grok. Personal access tokens still work for the Grok CLI."
      />
      <div className="space-y-5 px-5 py-5">
        <p className="text-[12px] leading-5 text-muted-foreground">
          Grok and ChatGPT are third-party processors of your study data. They can read lessons, progress, notes,
          submissions, and completed interviews. They cannot run code or start interviews.
        </p>

        <div className="rounded-xl border border-steel-800 bg-background/40 px-4 py-3">
          <p className="text-[13px] font-medium">Grok Custom Connector</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Token auth method: none (PKCE only). Leave Client Secret empty.
          </p>
          <dl className="mt-3 space-y-2">
            <CopyRow label="Server URL" value={endpoint} copied={copied} onCopy={copy} />
            <CopyRow label="Authorization Endpoint" value={`${siteOrigin()}/oauth/authorize`} copied={copied} onCopy={copy} />
            <CopyRow label="Token Endpoint" value={`${siteOrigin()}/oauth/token`} copied={copied} onCopy={copy} />
            <CopyRow label="Scopes" value="mcp:read" copied={copied} onCopy={copy} />
          </dl>
          <div className="mt-3">
            <IconAction
              text="Create OAuth client"
              label="Create OAuth client"
              pending={createOauth.isPending}
              variant="secondary"
              onClick={() => createOauth.mutate()}
            >
              <Plus className="h-3.5 w-3.5" />
            </IconAction>
          </div>
          {oauthClients.data && oauthClients.data.length > 0 ? (
            <ul className="mt-3 divide-y divide-steel-800 rounded-xl border border-steel-800">
              {oauthClients.data.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">{row.name}</p>
                    <p className="truncate font-mono text-[12px] text-muted-foreground">{row.client_id}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" size="sm" variant="secondary" onClick={() => copy(`client:${row.id}`, row.client_id)}>
                      {copied === `client:${row.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy
                    </Button>
                    <IconAction
                      text="Revoke"
                      label={`Revoke ${row.name}`}
                      pending={revokeOauth.isPending}
                      variant="ghost"
                      onClick={() => revokeOauth.mutate(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconAction>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-muted-foreground">No OAuth clients yet. Create one, then paste Client ID into Grok.</p>
          )}
        </div>

        <Field label="CLI endpoint" hint="For grok mcp add --header Authorization: Bearer ia_mcp_…">
          <div className="flex gap-2">
            <Input readOnly value={endpoint} />
            <Button type="button" size="sm" variant="secondary" onClick={() => copy("url", endpoint)}>
              {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Copy
            </Button>
          </div>
        </Field>

        <p className="text-[12px] leading-5 text-muted-foreground">
          ChatGPT and Grok are third-party processors of your study data. Revoke a token from this page to disconnect
          it. Recent tool calls are logged below (names only, not lesson bodies or source code).
        </p>

        {created ? (
          <div className="rounded-xl border border-copper/40 bg-background/40 px-4 py-3">
            <p className="text-[13px] font-medium">New token · {created.name}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Copy this now. AnvilPrep will not show the full token again.</p>
            <div className="mt-2 flex gap-2">
              <Input readOnly value={created.token} className="font-mono text-[12px]" />
              <Button type="button" size="sm" variant="secondary" onClick={() => copy("token", created.token)}>
                {copied === "token" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copy
              </Button>
            </div>
          </div>
        ) : null}

        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <Field label="Token name" className="min-w-0 flex-1">
            <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="ChatGPT" />
          </Field>
          <IconAction text="Create" label="Create MCP token" pending={create.isPending} type="submit">
            <Plus className="h-3.5 w-3.5" />
          </IconAction>
        </form>

        {tokens.isLoading ? <p className="text-[13px] text-muted-foreground">Loading tokens…</p> : null}
        {tokens.data && tokens.data.length === 0 && !created ? (
          <p className="text-[13px] text-muted-foreground">No MCP tokens yet.</p>
        ) : null}
        {tokens.data && tokens.data.length > 0 ? (
          <ul className="divide-y divide-steel-800 rounded-xl border border-steel-800">
            {tokens.data.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{row.name}</p>
                  <p className="font-mono text-[12px] text-muted-foreground">
                    {row.token_prefix}… · {row.last_used_at ? `Last used ${formatWhen(row.last_used_at)}` : "Never used"}
                  </p>
                </div>
                <IconAction
                  text="Revoke"
                  label={`Revoke ${row.name}`}
                  pending={revoke.isPending}
                  variant="ghost"
                  onClick={() => revoke.mutate(row.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconAction>
              </li>
            ))}
          </ul>
        ) : null}

        {access.data && access.data.length > 0 ? (
          <div>
            <p className="text-[13px] font-medium">Recent MCP access</p>
            <ul className="mt-2 space-y-1.5">
              {access.data.slice(0, 8).map((row) => (
                <li key={row.id} className="flex justify-between gap-3 text-[12px] text-muted-foreground">
                  <span className="min-w-0 truncate">
                    {row.method}
                    {row.name ? ` · ${row.name}` : ""} · {row.status}
                  </span>
                  <span className="shrink-0">{formatWhen(row.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function CopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: string | null;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-2">
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-[12px] text-foreground">{value}</dd>
      <Button type="button" size="sm" variant="secondary" onClick={() => onCopy(label, value)}>
        {copied === label ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        Copy
      </Button>
    </div>
  );
}

function LlmSettings({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const current = (queryClient.getQueryData<User>(queryKeys.me) ?? user) as User;
  const [provider, setProvider] = useState(user.llm_provider ?? "");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(
    () => (user.llm_keys ?? []).find((item) => item.provider === (user.llm_provider ?? ""))?.model ?? "",
  );
  const paid = provider === "openai" || provider === "gemini" || provider === "openrouter";
  const savedKey = (current.llm_keys ?? []).find((item) => item.provider === provider);

  function selectProvider(next: string) {
    setProvider(next);
    setModel((current.llm_keys ?? []).find((item) => item.provider === next)?.model ?? "");
  }

  const probe = useMutation({
    mutationFn: () => api.post<LlmProbe>("/api/v1/auth/me/llm/test", {}),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Unable to test the AI provider."),
  });

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
      probe.reset();
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
      probe.reset();
      toast.success("API key removed.");
    },
    onError: () => toast.error("Unable to remove API key."),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <SectionCard className="p-0">
        <PanelHeader
          title="Interview AI"
          body="Platform default uses the shared Ollama interviewer. Paid providers need your own API key. Each provider keeps its own key."
        />
        <div className="space-y-4 px-5 py-5">
          <Field label="Provider">
            <select className="select-field" value={provider} onChange={(event) => selectProvider(event.target.value)}>
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
          <p className="text-[12px] text-muted-foreground">
            Test uses the saved provider. Save first if you just changed these settings.
          </p>
          {probe.data ? <LlmProbeResult result={probe.data} /> : null}
        </div>
        <PanelFooter>
          <IconAction
            text="Test"
            label="Test connection"
            pending={probe.isPending}
            variant="secondary"
            disabled={probe.isPending || save.isPending}
            onClick={() => probe.mutate()}
          >
            <PlugZap className="h-3.5 w-3.5" />
          </IconAction>
          {savedKey ? (
            <IconAction
              text="Delete"
              label="Remove key"
              pending={clearKey.isPending}
              variant="ghost"
              onClick={() => clearKey.mutate()}
            >
              <KeyRound className="h-3.5 w-3.5" />
            </IconAction>
          ) : null}
          <IconAction text="Save" label="Save AI settings" pending={save.isPending} type="submit">
            <Save className="h-3.5 w-3.5" />
          </IconAction>
        </PanelFooter>
      </SectionCard>
    </form>
  );
}

function LlmProbeResult({ result }: { result: LlmProbe }) {
  const keyLabel = result.key_required
    ? result.using_user_key
      ? "Your API key"
      : "Platform key"
    : "Not required";
  const modelSource = result.model_source === "custom" ? "Custom" : "Platform default";
  const rows: { label: string; value: string }[] = [
    { label: "Provider", value: result.using_platform_default ? `${result.provider_label} (platform default)` : result.provider_label },
    { label: "Model", value: result.model ? `${result.model} · ${modelSource}` : modelSource },
    { label: "API key", value: keyLabel },
  ];
  if (result.endpoint) rows.push({ label: "Endpoint", value: result.endpoint });
  if (result.latency_ms != null) rows.push({ label: "Latency", value: `${result.latency_ms} ms` });
  if (result.reply) rows.push({ label: "Reply", value: result.reply });
  if (result.error) rows.push({ label: "Error", value: result.error });

  return (
    <div className="rounded-xl border border-steel-800 bg-background/40 px-4 py-3">
      <p className={`text-[13px] font-medium ${result.ok ? "text-success" : "text-coral"}`}>
        {result.ok ? "Connected" : "Could not connect"}
      </p>
      <dl className="mt-2 space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-0.5 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
            <dt className="text-[12px] text-muted-foreground">{row.label}</dt>
            <dd className="break-all text-[13px] text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PanelHeader({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-b border-steel-800 px-5 py-4">
      <SectionTitle>{title}</SectionTitle>
      <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{body}</p>
    </div>
  );
}

function PanelFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-1.5 border-t border-steel-800 bg-steel-950/50 px-5 py-3">
      {children}
    </div>
  );
}

function IconAction({
  text,
  label,
  pending,
  children,
  type = "button",
  variant,
  disabled,
  onClick,
}: {
  text: string;
  label: string;
  pending?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit";
  variant?: "default" | "secondary" | "ghost";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type={type}
      size="sm"
      variant={variant}
      disabled={disabled || pending}
      title={pending ? `${label}…` : label}
      aria-label={pending ? `${label}…` : label}
      onClick={onClick}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : children}
      {text}
    </Button>
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
