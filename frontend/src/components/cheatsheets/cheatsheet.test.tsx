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

describe("inline formatting", () => {
  it("renders `code` and **bold** markers as elements, not literal characters", () => {
    const block: CheatSheetBlock = {
      kind: "rule",
      title: "Rule",
      body: "Use `lo + (hi - lo) / 2` and **never** `(lo + hi) / 2`.",
      items: null,
    };
    const { container } = render(<CheatSheetBlockRenderer block={block} />, { wrapper });

    const codes = [...container.querySelectorAll("code")].map((el) => el.textContent);
    expect(codes).toContain("lo + (hi - lo) / 2");
    expect(codes).toContain("(lo + hi) / 2");
    expect(container.querySelector("strong")?.textContent).toBe("never");
    // The markers themselves must not survive into the rendered text.
    expect(container.textContent).not.toContain("`");
    expect(container.textContent).not.toContain("**");
  });

  it("formats inline markers inside table cells and checklist items", () => {
    const table: CheatSheetBlock = {
      kind: "table",
      title: "Costs",
      body: "",
      items: { headers: ["Op", "Cost"], rows: [["`ArrayList.get`", "**O(1)**"]] },
    };
    const { container, unmount } = render(<CheatSheetBlockRenderer block={table} />, { wrapper });
    expect(container.querySelector("td code")?.textContent).toBe("ArrayList.get");
    expect(container.querySelector("td strong")?.textContent).toBe("O(1)");
    unmount();

    const list: CheatSheetBlock = {
      kind: "bullets",
      title: "Rules",
      body: "",
      items: ["Prefer `ArrayDeque` over `Stack`"],
    };
    const { container: listContainer } = render(<CheatSheetBlockRenderer block={list} />, { wrapper });
    expect([...listContainer.querySelectorAll("li code")].map((el) => el.textContent)).toEqual([
      "ArrayDeque",
      "Stack",
    ]);
  });

  it("leaves unmatched markers alone rather than mangling the text", () => {
    const block: CheatSheetBlock = {
      kind: "tip",
      title: "Tip",
      body: "A lone ` backtick and a 2 * 3 product.",
      items: null,
    };
    const { container } = render(<CheatSheetBlockRenderer block={block} />, { wrapper });
    expect(container.querySelector("code")).toBeNull();
    expect(container.textContent).toContain("A lone ` backtick and a 2 * 3 product.");
  });

  it("preserves line breaks in example blocks", () => {
    const block: CheatSheetBlock = {
      kind: "example",
      title: "Confusion matrix",
      body: "line one\nline two",
      items: null,
    };
    const { container } = render(<CheatSheetBlockRenderer block={block} />, { wrapper });
    const body = container.querySelector(".whitespace-pre-wrap");
    expect(body?.textContent).toBe("line one\nline two");
  });
});
