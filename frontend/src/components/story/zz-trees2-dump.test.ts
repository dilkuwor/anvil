import { it } from "vitest";

import { AGY_TREES2_STORIES } from "./registry-agy-trees2";

const ONLY = process.env.DUMP_SLUG;
const INPUT = process.env.DUMP_EX;

it("dump", () => {
  for (const story of AGY_TREES2_STORIES) {
    if (ONLY && story.slugs[0] !== ONLY) continue;
    story.examples.forEach((example, index) => {
      if (INPUT && String(index) !== INPUT) return;
      const frames = story.frames(example.input);
      console.log(`\n===== ${story.slugs[0]} · ${example.input} · ${frames.length} frames`);
      frames.forEach((frame, at) => {
        console.log(`${at} [${frame.scene}${frame.codeLine !== undefined ? ` L${frame.codeLine}` : ""}] ${frame.caption}`);
        if (frame.quiz) console.log(`      Q(${frame.quiz.kind}): ${frame.quiz.question} -> ${frame.quiz.kind === "choice" ? frame.quiz.options[frame.quiz.answer] : `cell ${frame.quiz.answer} (val ${frame.state.tree?.[frame.quiz.answer]?.val})`}`);
      });
    });
  }
});
