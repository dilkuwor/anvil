import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { CheatSheetBlockRenderer } from "@/components/cheatsheets/cheatsheet-blocks";
import type { CheatSheetBlock } from "@/lib/cheatsheets";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("CheatSheetBlockRenderer", () => {
  it("renders tip blocks with title and body", () => {
    const tipBlock: CheatSheetBlock = {
      kind: "tip",
      title: "Pro Tip",
      body: "Round numbers to powers of 10 during estimations.",
      items: null,
    };
    render(<CheatSheetBlockRenderer block={tipBlock} />, { wrapper });
    expect(screen.getByText("Pro Tip")).toBeInTheDocument();
    expect(screen.getByText("Round numbers to powers of 10 during estimations.")).toBeInTheDocument();
  });

  it("renders formula blocks with copy button", () => {
    const formulaBlock: CheatSheetBlock = {
      kind: "formula",
      title: "QPS Math",
      body: "Daily Requests / 100,000 = Avg QPS",
      items: null,
    };
    render(<CheatSheetBlockRenderer block={formulaBlock} />, { wrapper });
    expect(screen.getByText("QPS Math")).toBeInTheDocument();
    expect(screen.getByText("Daily Requests / 100,000 = Avg QPS")).toBeInTheDocument();
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("renders checklist blocks and toggles check state", () => {
    const bulletsBlock: CheatSheetBlock = {
      kind: "bullets",
      title: "Key Checklist",
      body: "",
      items: ["Item A", "Item B"],
    };
    render(<CheatSheetBlockRenderer block={bulletsBlock} />, { wrapper });
    expect(screen.getByText("Key Checklist")).toBeInTheDocument();
    expect(screen.getByText("Item A")).toBeInTheDocument();

    const itemA = screen.getByText("Item A");
    fireEvent.click(itemA);
    expect(itemA.closest("li")?.className).toContain("line-through");
  });

  it("renders table blocks with headers and rows", () => {
    const tableBlock: CheatSheetBlock = {
      kind: "table",
      title: "Latency Numbers",
      body: "",
      items: {
        headers: ["Operation", "Latency"],
        rows: [["L1 Cache", "0.5 ns"], ["SSD Read", "100 us"]],
      },
    };
    render(<CheatSheetBlockRenderer block={tableBlock} />, { wrapper });
    expect(screen.getByText("Latency Numbers")).toBeInTheDocument();
    expect(screen.getByText("Operation")).toBeInTheDocument();
    expect(screen.getByText("L1 Cache")).toBeInTheDocument();
    expect(screen.getByText("0.5 ns")).toBeInTheDocument();
  });
});
