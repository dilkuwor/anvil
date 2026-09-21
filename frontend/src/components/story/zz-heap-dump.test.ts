import { it } from "vitest";

import { AGY_HEAP_STORIES } from "./registry-agy-heap";

const want = process.env.HEAP_SLUG;
for (const story of AGY_HEAP_STORIES) {
  if (want && story.slugs[0] !== want) continue;
  it(`dump ${story.slugs[0]}`, () => {
    const out: string[] = [];
    for (const example of story.examples) {
      const frames = story.frames(example.input);
      out.push(`\n=== ${example.input} (${frames.length} frames)`);
      if (process.env.HEAP_ALL !== "1" && example !== story.examples[0]) {
        const sol = frames.filter((f) => f.scene !== "card");
        sol.forEach((f, i) => out.push(`${i} [${f.scene}${f.codeLine !== undefined ? ` L${f.codeLine}` : ""}] ${f.caption}${f.quiz ? `\n     Q: ${f.quiz.question} -> ${f.quiz.answer}` : ""}`));
        continue;
      }
      frames.forEach((f, i) => {
        out.push(`${i} [${f.scene}${f.codeLine !== undefined ? ` L${f.codeLine}` : ""}] ${f.caption}${f.quiz ? `\n     Q: ${f.quiz.question} -> ${f.quiz.answer}${f.quiz.kind === "cell" ? ` of ${f.quiz.cells}` : ` ${JSON.stringify(f.quiz.options)}`}` : ""}`);
        if (process.env.HEAP_STATE === "1") out.push(`     ${JSON.stringify(f.state)}`);
      });
    }
    console.log(out.join("\n"));
  });
}
