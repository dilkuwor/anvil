import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { it } from "vitest";

import { AGY_CHOICES_STORIES } from "./registry-agy-choices";

it("zz-svg", () => {
  const want = process.env.DUMP_SLUG;
  const picks = (process.env.DUMP_FRAMES ?? "").split(",").map(Number);
  const story = AGY_CHOICES_STORIES.find((item) => item.slugs.includes(want ?? ""))!;
  const frames = story.frames(story.examples[Number(process.env.DUMP_EXAMPLE ?? 0)].input);
  for (const at of picks) {
    let svg = renderToStaticMarkup(<story.View state={frames[at].state} />);
    svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="1120" ').replace(/style="[^"]*max-height[^"]*"/, "");
    svg = svg.replace(/color-mix\(in srgb, var\(--accent\) (\d+)%, (?:var\(--background\)|transparent)\)/g, "rgba(80,120,255,0.$1)").replace(/color-mix\(in srgb, var\(--teal\) (\d+)%, (?:var\(--background\)|transparent)\)/g, "rgba(20,170,150,0.$1)").replace(/color-mix\(in srgb, var\(--coral\) (\d+)%, (?:var\(--background\)|transparent)\)/g, "rgba(240,90,70,0.$1)");
    svg = svg.replace(/var\(--foreground\)/g, "#111").replace(/var\(--muted-foreground\)/g, "#777").replace(/var\(--steel-700\)/g, "#999").replace(/var\(--accent\)/g, "#3060ff").replace(/var\(--coral\)/g, "#e0533d").replace(/var\(--teal\)/g, "#119988").replace(/var\(--background\)/g, "#fff");
    svg = svg.replace(/style="transform:translate\(([-\d.]+)px, ([-\d.]+)px\);opacity:(\d)"/g, 'transform="translate($1,$2)" opacity="$3"');
    writeFileSync("/private/tmp/claude-501/-Users-samir-MyHD-Code-anvil/c46c5e68-8fc0-4740-ab59-e83e71cf972c/scratchpad/choices/" + want + "-" + at + ".svg", svg.replace(/(<svg[^>]*>)/, '$1<rect width="100%" height="100%" fill="#fff"/>'));
  }
});
