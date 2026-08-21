import { afterEach, describe, expect, it } from "vitest";

import { ROBOTS_DISALLOW, absoluteUrl, originFromHost, pageMeta, siteUrl, truncateMeta } from "@/lib/seo";

const originalSite = process.env.SITE_URL;
const originalPublic = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSite == null) delete process.env.SITE_URL;
  else process.env.SITE_URL = originalSite;
  if (originalPublic == null) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalPublic;
});

describe("seo helpers", () => {
  it("normalizes the site URL and builds absolute paths", () => {
    process.env.SITE_URL = "https://anvil.example.com/";
    expect(siteUrl()).toBe("https://anvil.example.com");
    expect(absoluteUrl("/learn")).toBe("https://anvil.example.com/learn");
    expect(absoluteUrl("/")).toBe("https://anvil.example.com/");
    expect(originFromHost("anvil.example.com", "https")).toBe("https://anvil.example.com");
    expect(originFromHost("anvil.example.com, other", "https, http")).toBe("https://anvil.example.com");
    delete process.env.SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(siteUrl("https://anvil.example.com")).toBe("https://anvil.example.com");
  });

  it("truncates meta descriptions", () => {
    expect(truncateMeta("Short copy")).toBe("Short copy");
    expect(truncateMeta("x".repeat(200)).length).toBe(160);
  });

  it("builds canonical metadata and noindex pages", () => {
    process.env.SITE_URL = "https://anvil.example.com";
    const indexed = pageMeta({ title: "Learn", description: "Lessons.", path: "/learn" });
    expect(indexed.alternates?.canonical).toBe("/learn");
    expect(indexed.robots).toMatchObject({ index: true, follow: true });
    const hidden = pageMeta({ title: "Notes", description: "Private.", path: "/notes", noIndex: true });
    expect(hidden.robots).toMatchObject({ index: false, follow: false });
  });

  it("keeps private app routes out of robots", () => {
    expect(ROBOTS_DISALLOW).toEqual(
      expect.arrayContaining(["/dashboard", "/settings", "/notes", "/login", "/api/"]),
    );
  });
});
