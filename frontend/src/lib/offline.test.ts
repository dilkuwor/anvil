import { describe, expect, it } from "vitest";

import { urlsToDrop, type SavedNotes } from "@/lib/offline";

/**
 * Removing one saved section must never empty another. Sections overlap on purpose: a topic saved
 * by itself holds the same lessons as its category, and every section holds the shared session
 * reply, so only the addresses nothing else wants may be dropped.
 */
function note(urls: string[]): SavedNotes[string] {
  return { at: 1, pages: urls.length, urls };
}

describe("urlsToDrop", () => {
  it("drops everything when nothing else is saved", () => {
    const notes: SavedNotes = { "problems:trie": note(["/problems/lc-208", "/api/v1/problems/lc-208"]) };
    expect(urlsToDrop(notes, "problems:trie").sort()).toEqual([
      "/api/v1/problems/lc-208",
      "/problems/lc-208",
    ]);
  });

  it("keeps pages another saved section still needs", () => {
    const shared = "/learn/dsa/arrays-hashing/hashmap-internals";
    const notes: SavedNotes = {
      "learn-topic:arrays-hashing": note([shared, "/learn/dsa/arrays-hashing"]),
      "learn-category:dsa": note([shared, "/learn/dsa"]),
    };
    // The lesson belongs to both, so removing the topic must leave it for the category.
    expect(urlsToDrop(notes, "learn-topic:arrays-hashing")).toEqual(["/learn/dsa/arrays-hashing"]);
  });

  it("never drops the shared session reply, even as the last section goes", () => {
    const notes: SavedNotes = { "problems:all": note(["/api/v1/auth/me", "/problems/lc-1"]) };
    expect(urlsToDrop(notes, "problems:all")).toEqual(["/problems/lc-1"]);
  });

  it("returns nothing for a section that was never saved", () => {
    expect(urlsToDrop({}, "problems:all")).toEqual([]);
  });

  it("copes with a note saved before addresses were recorded", () => {
    const notes: SavedNotes = { old: { at: 1, pages: 3 } };
    expect(urlsToDrop(notes, "old")).toEqual([]);
  });

  it("frees a shared page once the last section holding it goes", () => {
    const shared = "/learn/dsa/arrays-hashing/hashmap-internals";
    const notes: SavedNotes = { "learn-category:dsa": note([shared]) };
    expect(urlsToDrop(notes, "learn-category:dsa")).toEqual([shared]);
  });
});
