"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { api, type SubmissionDetail, type SubmissionListResponse } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { formatRuntime, formatTimestamp, statusLabel } from "@/lib/utils";

export function SubmissionHistory({
  problemId,
  onLoadCode,
}: {
  problemId: string;
  onLoadCode: (source: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery({
    queryKey: queryKeys.submissions(problemId),
    queryFn: () => api.get<SubmissionListResponse>(`/api/v1/submissions?problem_id=${problemId}&page_size=50`),
  });
  const detail = useQuery({
    queryKey: queryKeys.submission(openId ?? ""),
    queryFn: () => api.get<SubmissionDetail>(`/api/v1/submissions/${openId}`),
    enabled: Boolean(openId),
  });

  if (list.isLoading) return <p className="text-muted-foreground">Loading submissions…</p>;
  if (!list.data?.items.length) return <p className="text-muted-foreground">No submissions yet.</p>;

  return (
    <div className="space-y-3">
      {list.data.items.map((item) => (
        <div key={item.id} className="rounded-lg border border-steel-800">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-steel-800/60"
            onClick={() => setOpenId(item.id === openId ? null : item.id)}
          >
            <span className={item.status === "ACCEPTED" ? "text-success" : "text-foreground"}>
              {statusLabel(item.status)}
            </span>
            <span className="text-muted-foreground">
              Java · {formatRuntime(item.runtime_ms)} · {formatTimestamp(item.created_at)}
            </span>
          </button>
          {openId === item.id && detail.data ? (
            <div className="border-t border-steel-800 p-3">
              <button
                type="button"
                className="mb-2 text-xs text-copper-light hover:underline"
                onClick={() => onLoadCode(detail.data.source_code)}
              >
                Load into editor
              </button>
              <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
                {detail.data.source_code}
              </pre>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
