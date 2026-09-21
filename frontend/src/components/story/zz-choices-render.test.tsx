import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

import { AGY_CHOICES_STORIES } from "./registry-agy-choices";

/** Throwaway geometry check: every text and shape stays inside the viewBox; texts on one line do not overlap. */
it("zz-render", () => {
  for (const story of AGY_CHOICES_STORIES) {
    for (const input of [...story.examples.map((example) => example.input)]) {
      const frames = story.frames(input);
      frames.forEach((frame, index) => {
        const svg = renderToStaticMarkup(<story.View state={frame.state} />);
        const box = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/)!;
        const width = Number(box[1]);
        const height = Number(box[2]);
        const texts = [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)].map((match) => {
          const attr = (name: string) => Number(match[1].match(new RegExp(`\\b${name}="(-?[\\d.]+)"`))?.[1] ?? 0);
          const anchor = match[1].match(/text-anchor="(\w+)"/)?.[1] ?? "start";
          const size = attr("font-size") || 11;
          const text = match[2].replace(/&[a-z]+;|&#x?\w+;/g, "x");
          const w = text.length * size * 0.62;
          const x = attr("x");
          const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x;
          return { text, left, right: left + w, y: attr("y"), size };
        });
        for (const t of texts) {
          const where = `${story.slugs[0]} ${input} frame ${index} "${t.text}"`;
          expect(t.left, where).toBeGreaterThanOrEqual(0);
          expect(t.right, where).toBeLessThanOrEqual(width);
          expect(t.y, where).toBeLessThanOrEqual(height);
          expect(t.y - t.size, where).toBeGreaterThanOrEqual(0);
        }
        for (let a = 0; a < texts.length; a++)
          for (let b = a + 1; b < texts.length; b++) {
            const p = texts[a];
            const q = texts[b];
            if (Math.abs(p.y - q.y) < 9 && p.left < q.right - 1 && q.left < p.right - 1) throw new Error(`${story.slugs[0]} ${input} frame ${index}: "${p.text}" overlaps "${q.text}"`);
          }
        for (const rect of svg.matchAll(/<rect([^>]*)>/g)) {
          const attr = (name: string) => Number(rect[1].match(new RegExp(`\\b${name}="(-?[\\d.]+)"`))?.[1] ?? 0);
          expect(attr("x") + attr("width"), `${story.slugs[0]} ${input} frame ${index} rect`).toBeLessThanOrEqual(width);
          expect(attr("y") + attr("height")).toBeLessThanOrEqual(height);
        }
      });
    }
  }
});
