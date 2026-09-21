import { it } from "vitest";

import { AGY_CHOICES_STORIES } from "./registry-agy-choices";

const want = process.env.DUMP_SLUG;
const only = process.env.DUMP_EXAMPLE ? Number(process.env.DUMP_EXAMPLE) : null;

it("zz-dump", () => {
  for (const story of AGY_CHOICES_STORIES) {
    if (want && !story.slugs.includes(want)) continue;
    story.examples.forEach((example, at) => {
      if (only !== null && only !== at) return;
      const frames = story.frames(example.input);
      console.log(`\n##### ${story.slugs[0]} ${example.input} (${frames.length} frames)`);
      frames.forEach((frame, index) => {
        const quiz = frame.quiz ? `\n      Q: ${frame.quiz.question} ${frame.quiz.kind === "choice" ? JSON.stringify(frame.quiz.options) + " -> " + frame.quiz.answer : "cell -> " + frame.quiz.answer + " fb=" + JSON.stringify(frame.quiz.feedback)}` : "";
        console.log(`${String(index).padStart(2)} [${frame.scene}${frame.codeLine !== undefined ? " L" + frame.codeLine : ""}] (${frame.caption.length}) ${frame.caption}${quiz}`);
      });
    });
  }
});
