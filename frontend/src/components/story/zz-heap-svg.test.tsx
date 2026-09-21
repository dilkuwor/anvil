import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { it } from "vitest";

import { AGY_HEAP_STORIES } from "./registry-agy-heap";

it("zz-svg", () => {
  for (const story of AGY_HEAP_STORIES) {
    const want: Record<string, number[]> = JSON.parse(process.env.HEAP_FRAMES ?? "{}");
    const list = want[story.slugs[0]];
    if (!list) continue;
    const frames = story.frames(story.examples[Number(process.env.HEAP_EX ?? 0)].input);
    for (const index of list) {
      const frame = frames[index];
      const pick = frame.quiz?.kind === "cell" ? { onPick: () => {}, picked: null, answer: frame.quiz.answer, rejected: [] } : undefined;
      let html = renderToStaticMarkup(createElement(story.View, { state: frame.state, pick }));
      html = html
        .replace(/color-mix\(in srgb, var\(--accent\) (\d+)%, transparent\)/g, (_, p) => `rgba(90,140,255,${Number(p) / 100})`)
        .replace(/color-mix\(in srgb, var\(--teal\) (\d+)%, transparent\)/g, (_, p) => `rgba(40,180,160,${Number(p) / 100})`)
        .replace(/color-mix\(in srgb, var\(--coral\) (\d+)%, transparent\)/g, (_, p) => `rgba(240,100,90,${Number(p) / 100})`)
        .replace(/color-mix\(in srgb, var\(--steel-\d+\) (\d+)%, transparent\)/g, (_, p) => `rgba(120,130,150,${Number(p) / 200})`)
        .replace(/var\(--foreground\)/g, "#111").replace(/var\(--muted-foreground\)/g, "#667").replace(/var\(--steel-700\)/g, "#99a").replace(/var\(--steel-900\)/g, "#dde")
        .replace(/var\(--accent\)/g, "#3a6cf0").replace(/var\(--coral\)/g, "#e0574a").replace(/var\(--teal\)/g, "#1a9c8a")
        .replace(/style="transform:translate\(([-\d.]+)px, ([-\d.]+)px\)"/g, 'transform="translate($1 $2)"')
        .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ').replace(/(<svg[^>]*>)/, '$1<rect width="560" height="600" fill="#fff"/>');
      writeFileSync(`/private/tmp/claude-501/-Users-samir-MyHD-Code-anvil/c46c5e68-8fc0-4740-ab59-e83e71cf972c/scratchpad/svg/${story.slugs[0]}-${index}.svg`, html);
    }
  }
});
