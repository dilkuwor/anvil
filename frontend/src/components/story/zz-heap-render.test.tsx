import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

import { AGY_HEAP_STORIES } from "./registry-agy-heap";

for (const story of AGY_HEAP_STORIES) {
  it(`zz-render ${story.slugs[0]}`, () => {
    for (const example of story.examples) {
      for (const frame of story.frames(example.input)) {
        const pick = frame.quiz?.kind === "cell" ? { onPick: () => {}, picked: null, answer: frame.quiz.answer, rejected: [0] } : undefined;
        const html = renderToStaticMarkup(createElement(story.View, { state: frame.state, pick }));
        expect(html).not.toMatch(/NaN|undefined/);
        // every x / cx / x1 coordinate stays inside the 560-wide box
        for (const match of html.matchAll(/\b(?:x|cx|x1|x2)="(-?[\d.]+)"/g)) {
          const value = Number(match[1]);
          expect(value, `${match[0]} in "${frame.caption}"`).toBeGreaterThanOrEqual(0);
          expect(value, `${match[0]} in "${frame.caption}"`).toBeLessThanOrEqual(560);
        }
        for (const match of html.matchAll(/translate\((-?[\d.]+)px, (-?[\d.]+)px\)/g)) {
          expect(Number(match[1])).toBeGreaterThanOrEqual(0);
          expect(Number(match[1])).toBeLessThanOrEqual(560);
        }
        if (frame.quiz?.kind === "cell") expect((html.match(/role="button"/g) ?? []).length, frame.caption).toBe(frame.quiz.cells);
      }
    }
  });
}
