import { it } from "vitest";

import { AGY_DP3_STORIES } from "./registry-agy-dp3";

it("dump", () => {
  const want = process.env.DUMP_SLUG;
  for (const story of AGY_DP3_STORIES) {
    if (want && !story.slugs.includes(want)) continue;
    for (const example of story.examples) {
      const frames = story.frames(example.input);
      console.log(`\n=== ${story.slugs[0]} ${example.input} (${frames.length} frames)`);
      frames.forEach((frame, index) => {
        console.log(`${index} [${frame.scene}${frame.codeLine !== undefined ? " L" + frame.codeLine : ""}] ${frame.caption}${frame.quiz ? "\n      Q(" + frame.quiz.kind + "): " + frame.quiz.question + " -> " + frame.quiz.answer : ""}`);
      });
    }
  }
});
