import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";

describe("ThemeToggle", () => {
  it("exposes an accessible label for switching themes", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: /switch to (light|dark) theme/i })).toBeInTheDocument();
  });
});
