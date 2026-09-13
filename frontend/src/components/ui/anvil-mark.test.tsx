import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnvilMark } from "@/components/ui/anvil-mark";
import { BrandMark } from "@/components/ui/section";
import { anvilMarkSvg } from "@/lib/brand";

describe("AnvilMark", () => {
  it("renders an accessible inline SVG", () => {
    const { container } = render(<AnvilMark title="Anvil logo" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("Anvil logo");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 512 512");
  });

  it("keeps gradient ids unique when two marks share a page", () => {
    const { container } = render(
      <>
        <AnvilMark />
        <AnvilMark />
      </>,
    );
    const ids = [...container.querySelectorAll("linearGradient, radialGradient, clipPath")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("drops the tile for the bare glyph but keeps both halves of the slice", () => {
    const { container } = render(<AnvilMark variant="glyph" title="" />);
    expect(container.querySelectorAll("rect").length).toBe(0);
    expect(container.querySelectorAll("path").length).toBe(2);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("BrandMark", () => {
  it("pairs the mark with the wordmark", () => {
    const { container, getByText } = render(<BrandMark compact />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(getByText("Anvil")).toBeInTheDocument();
  });
});

describe("anvilMarkSvg", () => {
  it("emits a rounded tile, a square tile, and a padded maskable variant", () => {
    expect(anvilMarkSvg("tile")).toContain('rx="114"');
    expect(anvilMarkSvg("square")).toContain('rx="0"');
    expect(anvilMarkSvg("maskable")).toContain("scale(0.74)");
    expect(anvilMarkSvg("glyph")).not.toContain("url(#bg)");
  });
});
