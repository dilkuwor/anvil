import { it } from "vitest";

import { AGY_TREES3_STORIES } from "./registry-agy-trees3";

it("dump", () => {
  const want = process.env.DUMP_SLUG;
  const lines: string[] = [];
  for (const story of AGY_TREES3_STORIES) {
    if (want && !story.slugs.includes(want)) continue;
    for (const input of [...story.examples.map((e: { input: string }) => e.input), story.practiceInput]) {
      const frames = story.frames(input);
      lines.push(`\n===== ${story.slugs[0]} :: ${input} :: ${frames.length} frames :: answer ${story.answer(input)}`);
      if (input === story.practiceInput && !process.env.DUMP_ALL) continue;
      frames.forEach((f: { scene: string; caption: string; codeLine?: number; quiz?: { kind: string; question: string; answer: number; options?: string[] } }, i: number) => {
        if (process.env.DUMP_FROM && f.scene !== process.env.DUMP_FROM) return;
        lines.push(`${i} [${f.scene}${f.codeLine !== undefined ? ` L${f.codeLine}` : ""}] (${f.caption.length}) ${f.caption}`);
        if (f.quiz) lines.push(`      QUIZ(${f.quiz.kind}) ${f.quiz.question} -> ${f.quiz.answer}${f.quiz.options ? ` ${JSON.stringify(f.quiz.options)}` : ""}`);
      });
    }
  }
  console.log(lines.join("\n"));
});
