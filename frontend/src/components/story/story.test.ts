import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { KNOWN_PROBLEMS } from "./known-problems";
import { listStories } from "./registry";
import { SCENES, type StoryFrame } from "./types";

/**
 * These rules exist because each one was a real bug in a shipped story.
 * Fix the story, never the rule. See STORY_GUIDE.md.
 */

// Words a caption may not use: the reader should not need to already know the algorithm.
const JARGON = /\b(monotonic\w*|invariant|sentinel|in-?degree|brute[- ]force|base case|truthy|falsy|amortized|contiguous|initiali[sz]e\w*|traverse\w*|auxiliary|in-place|naive|FIFO|LIFO|DFS|BFS|topological|memoiz\w*|recurrence|subproblem\w*|enqueue\w*|dequeue\w*|decrement\w*|increment\w*|iterat\w*)\b/i;
// Code does not belong in a sentence.
const CODE_IN_CAPTION = /===|!==|&&|\|\||=>|Math\.|\w+\[\w+\]\[|\bdp\[|\bnums\[|\bheight\[|\.next\b|\.length\b|\+\+|--/;
const NOT_JAVA = /\b(const|let|var|function)\s|===|!==|=>|:\s*(number|string|boolean)\b|\bnew Array\b|\.push\(|\.shift\(|\bMath\.floor\b|\bnull \?\?|\?\?/;

type AnyFrame = StoryFrame<unknown>;
const sentences = (text: string) => (text.match(/[.!?](\s|$)/g) ?? []).length;

describe("visual stories", () => {
  for (const story of listStories()) {
    const runs = () => story.examples.map((example) => ({ example, frames: story.frames(example.input) as AnyFrame[] }));

    describe(story.slugs[0], () => {
      it("solves every example correctly, and only links to problems that exist", () => {
        for (const example of story.examples) expect(story.answer(example.input)).toBe(example.expected);
        for (const slug of story.slugs) expect(KNOWN_PROBLEMS[slug], `story slug ${slug}`).toBeTruthy();
        for (const sibling of story.siblings) expect(KNOWN_PROBLEMS[sibling.slug], `sibling ${sibling.slug}`).toBeTruthy();
      });

      it("tells all five scenes in order and ends on a quiet picture to remember", () => {
        for (const { example, frames } of runs()) {
          const order = frames.map((frame) => SCENES.findIndex((scene) => scene.id === frame.scene));
          expect([...order].sort((a, b) => a - b)).toEqual(order);
          expect(new Set(order).size).toBe(SCENES.length);
          expect(frames.length, "too long to hold attention").toBeLessThanOrEqual(70);
          const solution = frames.filter((frame) => frame.scene === "solution");
          expect(solution.some((frame) => frame.caption.includes(`answer is ${example.expected}`))).toBe(true);
          expect(solution.some((frame) => frame.caption.startsWith(`Time: ${story.complexity.time}`))).toBe(true);
          expect(solution.some((frame) => frame.caption.startsWith(`Space: ${story.complexity.space}`))).toBe(true);
          expect(frames.at(-1)?.scene).toBe("card");
          expect(frames.at(-1)?.quiz).toBeUndefined();
          expect(story.frames(example.input)).toEqual(frames);
        }
      });

      it("speaks plainly: short captions, no code, no jargon, in the metaphor's words", () => {
        for (const { frames } of runs()) {
          for (const frame of frames) {
            const where = `"${frame.caption}"`;
            expect(frame.caption.length, where).toBeLessThanOrEqual(170);
            expect(sentences(frame.caption), where).toBeLessThanOrEqual(3);
            expect((frame.caption.match(/!/g) ?? []).length, where).toBeLessThanOrEqual(1);
            expect(frame.caption.match(CODE_IN_CAPTION)?.[0], where).toBeUndefined();
            expect(frame.caption.match(JARGON)?.[0], where).toBeUndefined();
            expect(frame.caption, where).not.toMatch(/undefined|NaN|\$\{|\[object/);
          }
          const told = frames.filter((frame) => frame.scene === "solution" && !/^(Time|Space):/.test(frame.caption));
          const inMetaphor = told.filter((frame) => story.metaphor.terms.some((term) => frame.caption.toLowerCase().includes(term.toLowerCase())));
          expect(inMetaphor.length / told.length, "solution captions must use the metaphor's words").toBeGreaterThanOrEqual(0.5);
        }
      });

      it("shows Java, and highlights a real line of it", () => {
        for (const line of story.code) expect(line.match(NOT_JAVA)?.[0], `code line: ${line}`).toBeUndefined();
        for (const { frames } of runs()) {
          for (const frame of frames) {
            if (frame.codeLine === undefined) continue;
            expect(frame.scene).toBe("solution");
            expect(story.code[frame.codeLine]?.trim().replace(/[{}]/g, "").length, `codeLine ${frame.codeLine} is blank or a lone brace`).toBeGreaterThan(0);
          }
        }
      });

      it("asks real predictions: answerable, not given away, revealed on the next frame", () => {
        for (const { frames } of runs()) {
          frames.forEach((frame, index) => {
            const quiz = frame.quiz;
            if (!quiz) return;
            const next = frames[index + 1];
            expect(next, "a quiz needs a reveal frame after it").toBeTruthy();
            expect(JSON.stringify(next.state), `reveal must change the picture: "${quiz.question}"`).not.toBe(JSON.stringify(frame.state));
            if (quiz.kind === "choice") {
              expect(quiz.options[quiz.answer]).toBeTruthy();
              return;
            }
            expect(quiz.answer).toBeGreaterThanOrEqual(0);
            expect(quiz.answer).toBeLessThan(quiz.cells);
            expect(quiz.feedback[quiz.answer]).toBeUndefined();
            expect(quiz.otherwise, "`otherwise` must nudge, not name the answer").not.toMatch(new RegExp(`\\b${quiz.answer}\\b`));
            expect(quiz.otherwise).not.toMatch(/^click /i);
          });
        }
      });

      it("has a fresh practice run the reader drives, and a card that does not give itself away", () => {
        expect(story.examples.map((example) => example.input)).not.toContain(story.practiceInput);
        expect(story.trigger).not.toMatch(/→|->|\bthink\b/i);
        expect(story.template.join("\n")).not.toBe(story.code.join("\n"));
        const card = (story.frames(story.examples[0].input) as AnyFrame[]).filter((frame) => frame.scene === "card");
        expect(card.filter((frame) => frame.quiz).length).toBeGreaterThanOrEqual(2);
        expect(card[0].caption).not.toMatch(/^remember/i);
        for (const frame of card) expect(frame.codeLine).toBeUndefined();
      });

      it("shows its named trap in the pictures, not only on the card", () => {
        expect(story.traps.length).toBeGreaterThan(0);
        const name = story.traps[0].name.replace(/^the /i, "").toLowerCase();
        const inputs = [...story.examples.map((example) => example.input)];
        const shown = inputs.some((input) => (story.frames(input) as AnyFrame[]).some((frame) => frame.caption.toLowerCase().includes(name)));
        expect(shown, `no caption ever mentions "${story.traps[0].name}"`).toBe(true);
      });
    });
  }

  describe("pictures", () => {
    const dir = __dirname;
    for (const file of readdirSync(dir).filter((name) => name.endsWith("-view.tsx"))) {
      it(`${file} respects reduced motion and uses the shared click targets`, () => {
        const source = readFileSync(join(dir, file), "utf8");
        expect(source, "use the GLIDE class from view-kit, never an inline transition").not.toMatch(/transition\s*:/);
        expect(source, "use <PickTarget> from view-kit for clicks").not.toMatch(/<g[^>]*onClick/);
        if (/\bpick\b/.test(source)) expect(source).toMatch(/PickTarget/);
        expect(source, "nothing may flash, pulse, shake or bounce").not.toMatch(/animate-|<animate|keyframes/);
      });
    }
  });

  it("teaches the Ghost Trap on abba: the tail must not move backwards", () => {
    const story = listStories().find((item) => item.slugs.includes("lc-3"))!;
    const frames = story.frames("abba").filter((frame) => frame.scene === "solution");
    const ghost = frames.find((frame) => frame.caption.includes("Ghost Trap"));
    expect(ghost?.state.ghostTail).toBe(1);
    expect(ghost?.state.left).toBe(2);
    expect(frames.find((frame) => frame.quiz?.kind === "cell" && frame.quiz.answer === 2)).toBeTruthy();
  });
});
