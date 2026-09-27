import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type ExecutionResult } from "@/lib/api";

export type WorkedExample = {
  approach: string;
  idea: string;
  steps: string[];
  language: string;
  header: string;
  blocks: string[];
  footer: string;
  total_levels: number;
  levels_done: number;
};

export type WorkedCheck = {
  passed: boolean;
  level: number;
  levels_done: number;
  total_levels: number;
  result: ExecutionResult;
};

export const workedKeys = {
  example: (slug: string) => ["worked", slug] as const,
};

export function useWorkedExample(slug: string) {
  return useQuery({
    queryKey: workedKeys.example(slug),
    queryFn: () =>
      api.get<WorkedExample>(`/api/v1/problems/${slug}/worked-example`),
  });
}

export function useCheckWorkedExample(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ level, filled }: { level: number; filled: string[] }) =>
      api.post<WorkedCheck>(`/api/v1/problems/${slug}/worked-example/check`, {
        level,
        filled,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData<WorkedExample>(
        workedKeys.example(slug),
        (current) =>
          current ? { ...current, levels_done: data.levels_done } : current,
      );
    },
  });
}
