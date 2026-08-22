import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VerifyEmailPanel } from "@/components/auth/verify-email-form";

const postMock = vi.hoisted(() => vi.fn());

const searchParams = vi.hoisted(() => ({ value: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams.value,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...original,
    api: {
      ...original.api,
      post: postMock,
    },
  };
});

function renderPanel(token?: string) {
  searchParams.value = new URLSearchParams(token ? { token } : {});
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <VerifyEmailPanel />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  postMock.mockReset();
});

describe("VerifyEmailPanel", () => {
  it("verifies a valid token and confirms success", async () => {
    postMock.mockResolvedValueOnce({ ok: true, message: "ok" });
    renderPanel("ia_evt_valid");

    expect(screen.getByText("Verifying your email…")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Email verified")).toBeInTheDocument();
    });
    expect(postMock).toHaveBeenCalledWith("/api/v1/auth/verify-email", { token: "ia_evt_valid" });
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toBeInTheDocument();
  });

  it("explains invalid or expired links without leaking token details", async () => {
    postMock.mockRejectedValueOnce(
      new (await import("@/lib/api")).ApiError(400, "This verification link is invalid or has expired.", "invalid_verification_token"),
    );
    renderPanel("ia_evt_stale");

    await waitFor(() => {
      expect(screen.getByText("We couldn't verify this link")).toBeInTheDocument();
    });
    expect(screen.getByText(/invalid or has expired/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open settings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
  });

  it("handles a missing token without firing a request", () => {
    renderPanel();
    expect(screen.getByText("This link is missing its verification token")).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });
});
