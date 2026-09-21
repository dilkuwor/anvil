import { it } from "vitest";

import { AGY_TREES1_STORIES } from "./registry-agy-trees1";

const only = process.env.DUMP_SLUG;

it("dump", () => {
  for (const story of AGY_TREES1_STORIES) {
    if (only && story.slugs[0] !== only) continue;
    for (const example of story.examples) {
      const frames = story.frames(example.input);
      console.log(`\n=== ${story.slugs[0]} ${example.input} (${frames.length} frames) expected ${example.expected} got ${story.answer(example.input)}`);
      frames.forEach((frame, index) => {
        const quiz = frame.quiz;
        console.log(`${index} [${frame.scene}${frame.codeLine !== undefined ? ` L${frame.codeLine}` : ""}] ${frame.caption}`);
        if (quiz) console.log(`      Q(${quiz.kind}): ${quiz.question} -> ${quiz.kind === "choice" ? quiz.options.map((o, i) => (i === quiz.answer ? `*${o}*` : o)).join(" | ") : `cell ${quiz.answer}; fb ${JSON.stringify(quiz.feedback)}; else ${quiz.otherwise}`}  WHY: ${quiz.why}`);
      });
    }
  }
});
