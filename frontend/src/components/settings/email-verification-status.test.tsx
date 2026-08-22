import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EmailVerificationStatus } from "@/components/settings/email-verification-status";
import { ApiError, type User } from "@/lib/api";

const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

const postMock = vi.hoisted(() => vi.fn());

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

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u-1",
    email: "sam@example.com",
    username: "sam",
    role: "user",
    is_active: true,
    created_at: "2026-08-22T00:00:00Z",
    ...overrides,
  };
}

function renderWithClient(user: User) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <EmailVerificationStatus user={user} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  postMock.mockReset();
  toastMocks.success.mockClear();
  toastMocks.error.mockClear();
});

describe("EmailVerificationStatus", () => {
  it("shows a subtle verified indicator and no action for verified accounts", () => {
    renderWithClient(makeUser({ email_verified: true }));
    expect(screen.getByTestId("email-status")).toHaveTextContent("Verified");
    expect(screen.queryByRole("button", { name: "Resend verification email" })).not.toBeInTheDocument();
  });

  it("shows a warning and resend button for unverified accounts", () => {
    renderWithClient(makeUser({ email_verified: false }));
    expect(screen.getByTestId("email-status")).toHaveTextContent("Email not verified");
    expect(screen.getByRole("button", { name: "Resend verification email" })).toBeEnabled();
  });

  it("shows nothing conclusive when the field is missing from the payload", () => {
    const { container } = renderWithClient(makeUser());
    expect(container.querySelector('[data-testid="email-status"]')).toBeNull();
  });

  it("sends the request, disables the button while pending, and confirms success", async () => {
    let resolveRequest: (value: { ok: boolean; message: string }) => void = () => {};
    postMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    renderWithClient(makeUser({ email_verified: false }));

    const button = screen.getByRole("button", { name: "Resend verification email" });
    fireEvent.click(button);
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith("/api/v1/auth/resend-verification");
    });
    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    resolveRequest({ ok: true, message: "ok" });
    await waitFor(() => {
      expect(screen.getByText("Verification email sent. Check your inbox.")).toBeInTheDocument();
    });
    expect(toastMocks.success).toHaveBeenCalledWith("Verification email sent. Check your inbox.");
    expect(screen.getByRole("button", { name: "Resend verification email" })).toBeEnabled();
  });

  it("handles rate limiting with a friendly message", async () => {
    postMock.mockRejectedValueOnce(new ApiError(429, "Too many verification emails requested.", "rate_limited"));
    renderWithClient(makeUser({ email_verified: false }));

    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith(
        "Too many verification emails requested. Please wait a while before trying again.",
      );
    });
    expect(screen.queryByText("Verification email sent. Check your inbox.")).not.toBeInTheDocument();
  });

  it("refreshes state instead of erroring when the account is already verified", async () => {
    postMock.mockRejectedValueOnce(new ApiError(409, "Your email address is already verified.", "email_already_verified"));
    renderWithClient(makeUser({ email_verified: false }));

    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    await waitFor(() => {
      expect(toastMocks.success).toHaveBeenCalledWith("Your email is already verified.");
    });
  });

  it("surfaces other API errors gracefully", async () => {
    postMock.mockRejectedValueOnce(new ApiError(503, "Email sending is not configured.", "email_not_configured"));
    renderWithClient(makeUser({ email_verified: false }));

    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith("Email sending is not configured.");
    });
  });
});
