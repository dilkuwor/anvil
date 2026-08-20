import { describe, expect, it } from "vitest";

import { listRoadmapHref } from "@/lib/lists";

describe("listRoadmapHref", () => {
  it("points the roadmap at the selected custom list", () => {
    expect(listRoadmapHref("list-1")).toBe("/roadmap?list=list-1");
  });
});
