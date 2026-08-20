"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateListModal({
  title = "Create a problem list",
  initialName = "",
  initialDescription = "",
  confirmLabel = "Create List",
  busy = false,
  error = null,
  onClose,
  onSubmit,
}: {
  title?: string;
  initialName?: string;
  initialDescription?: string;
  confirmLabel?: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (name: string, description: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-background/70" aria-label="Close" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-list-title"
        className="relative w-full max-w-md rounded-2xl border border-steel-800 bg-steel-900 p-6 shadow-lg"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(name.trim(), description.trim());
        }}
      >
        <h2 id="create-list-title" className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="list-name">List name</Label>
            <Input id="list-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="list-description">Description (optional)</Label>
            <textarea
              id="list-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={400}
              rows={3}
              className="flex w-full rounded-md border border-input-border bg-steel-900 px-3 py-2 text-sm text-input-foreground outline-none placeholder:text-input-placeholder"
            />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-coral">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : confirmLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
