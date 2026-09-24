import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CodeViewer } from "@/components/problems/code-viewer";

describe("CodeViewer", () => {
  const sampleCode = `public class Solution {
    public int twoSum(int[] nums, int target) {
        return 0;
    }
}`;

  it("renders filename, language tag, and line numbers", () => {
    render(<CodeViewer code={sampleCode} filename="Solution.java" language="Java" />);

    expect(screen.getByText("Solution.java")).toBeInTheDocument();
    expect(screen.getByText("Java")).toBeInTheDocument();
    expect(screen.getAllByText("5 lines").length).toBeGreaterThanOrEqual(1);
    // Line numbers in gutter
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders Java tokens with syntax styles", () => {
    render(<CodeViewer code={sampleCode} />);

    // Keywords
    const keywords = screen.getAllByText("public");
    expect(keywords.length).toBeGreaterThanOrEqual(1);
    expect(keywords[0].className).toContain("text-[#cf222e]");

    // Class name
    const classNameEl = screen.getByText("Solution");
    expect(classNameEl.className).toContain("text-[#0969da]");

    // Primitive type
    const intPrimitive = screen.getAllByText("int");
    expect(intPrimitive.length).toBeGreaterThanOrEqual(1);
    expect(intPrimitive[0].className).toContain("text-[#0550ae]");
  });

  it("calls onLoadCode when Load into editor is clicked", () => {
    const handleLoad = vi.fn();
    render(<CodeViewer code={sampleCode} onLoadCode={handleLoad} />);

    const loadButton = screen.getByText("Load into editor");
    fireEvent.click(loadButton);

    expect(handleLoad).toHaveBeenCalledTimes(1);
    expect(handleLoad).toHaveBeenCalledWith(sampleCode.trim() + "\n");
  });

  it("calls onClose when Hide button is clicked", () => {
    const handleClose = vi.fn();
    render(<CodeViewer code={sampleCode} onClose={handleClose} />);

    const hideButton = screen.getByText("Hide");
    fireEvent.click(hideButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("renders the Download button", () => {
    render(<CodeViewer code={sampleCode} filename="Solution.java" />);

    expect(screen.getByText("Download")).toBeInTheDocument();
  });
});
