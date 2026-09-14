import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VisualizationsView } from "./visualizations-view";
import {
  getViz,
  getVizCategory,
  listVizCatalog,
} from "@/components/learn/viz/registry";

// Mock next/navigation
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("Visualizer Registry Catalog", () => {
  it("categorizes all 22 visualizers into dsa and system-design", () => {
    const catalog = listVizCatalog();
    expect(catalog).toHaveLength(22);

    const dsaItems = catalog.filter((c) => c.category === "dsa");
    const sdItems = catalog.filter((c) => c.category === "system-design");

    expect(dsaItems).toHaveLength(13);
    expect(sdItems).toHaveLength(9);

    expect(getVizCategory("sliding-window")).toBe("dsa");
    expect(getVizCategory("binary-search")).toBe("dsa");
    expect(getVizCategory("cache-aside")).toBe("system-design");
    expect(getVizCategory("consistent-hashing")).toBe("system-design");
    expect(getVizCategory("circuit-breaker")).toBe("system-design");
  });

  it("provides tags and labels for every catalog item", () => {
    const catalog = listVizCatalog();
    for (const item of catalog) {
      expect(item.definition.id).toBeTruthy();
      expect(item.definition.title).toBeTruthy();
      expect(item.definition.summary).toBeTruthy();
      expect(item.categoryLabel).toBeTruthy();
      expect(Array.isArray(item.tags)).toBe(true);
      expect(item.tags.length).toBeGreaterThan(0);
    }
  });
});

describe("VisualizationsView Component", () => {
  it("renders page header, active visualizer stage, and catalog grid", () => {
    mockSearchParams = new URLSearchParams();
    render(<VisualizationsView />);

    expect(screen.getByText("Interactive Visualizers")).toBeInTheDocument();
    expect(screen.getByText(/22 visualizers · 13 Algorithms & DSA · 9 System Design/)).toBeInTheDocument();

    // Verify category tabs
    expect(screen.getByRole("button", { name: /^All \(22\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Algorithms & DSA \(13\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^System Design \(9\)/ })).toBeInTheDocument();

    // Default visualizer is sliding window
    expect(screen.getAllByText("Variable-size sliding window").length).toBeGreaterThan(0);
  });

  it("filters catalog cards by category", () => {
    mockSearchParams = new URLSearchParams();
    render(<VisualizationsView />);

    // Click System Design tab
    const sdTab = screen.getByRole("button", { name: /^System Design \(9\)/ });
    fireEvent.click(sdTab);

    const cacheAsideTitle = getViz("cache-aside")!.title;
    expect(screen.getByRole("heading", { name: cacheAsideTitle })).toBeInTheDocument();

    // Click Algorithms & DSA tab
    const dsaTab = screen.getByRole("button", { name: /^Algorithms & DSA \(13\)/ });
    fireEvent.click(dsaTab);

    const binarySearchTitle = getViz("binary-search")!.title;
    expect(screen.getByRole("heading", { name: binarySearchTitle })).toBeInTheDocument();
  });

  it("filters visualizers using the search bar", () => {
    mockSearchParams = new URLSearchParams();
    render(<VisualizationsView />);

    const searchInput = screen.getByPlaceholderText(/Search visualizers/);
    fireEvent.change(searchInput, { target: { value: "token bucket" } });

    const tokenBucketTitle = getViz("token-bucket")!.title;
    expect(screen.getByRole("heading", { name: tokenBucketTitle })).toBeInTheDocument();

    const binarySearchTitle = getViz("binary-search")!.title;
    expect(screen.queryByRole("heading", { name: binarySearchTitle })).not.toBeInTheDocument();
  });

  it("switches active visualizer using the dropdown selector", () => {
    mockSearchParams = new URLSearchParams();
    render(<VisualizationsView />);

    const select = screen.getByLabelText("Select visualizer");
    fireEvent.change(select, { target: { value: "consistent-hashing" } });

    // Active stage should now show consistent hashing
    const consistentHashing = getViz("consistent-hashing")!;
    expect(screen.getAllByText(consistentHashing.title).length).toBeGreaterThan(0);
  });

  it("initializes with the visualizer specified in URL query params", () => {
    mockSearchParams = new URLSearchParams("viz=circuit-breaker");
    render(<VisualizationsView />);

    const circuitBreaker = getViz("circuit-breaker")!;
    expect(screen.getAllByText(circuitBreaker.title).length).toBeGreaterThan(0);
  });
});
