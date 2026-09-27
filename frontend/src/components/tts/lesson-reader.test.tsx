import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LessonMarkdown } from "@/components/learn/markdown";
import { LessonReaderBar, LessonReaderButton, LessonReaderProvider } from "@/components/tts/lesson-reader";
import { buildLessonSpeech } from "@/lib/lesson-speech";

const fetchSpeech = vi.fn();
vi.mock("@/lib/tts", () => ({ fetchSpeech: (...args: unknown[]) => fetchSpeech(...args) }));

const content = `# Hashing

Intro paragraph.

## Mental Model

The key is the solution.

## How It Works

Three shapes.`;

function Page({ onLocked }: { onLocked?: () => void } = {}) {
  const lesson = { title: "Hashing", content, takeaways: ["State the key."] };
  return (
    <LessonReaderProvider sections={buildLessonSpeech(lesson)} storageKey="lesson-1" onLocked={onLocked}>
      <LessonReaderButton />
      <LessonReaderBar />
      <LessonMarkdown content={content} />
    </LessonReaderProvider>
  );
}

describe("LessonReader", () => {
  const play = vi.fn();
  const pause = vi.fn();

  beforeEach(() => {
    fetchSpeech.mockReset();
    fetchSpeech.mockImplementation((text: string) => Promise.resolve(new Blob([text], { type: "audio/wav" })));
    play.mockReset().mockResolvedValue(undefined);
    pause.mockReset();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    Object.defineProperty(URL, "createObjectURL", { value: vi.fn(() => "blob:clip"), configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
    Element.prototype.scrollIntoView = vi.fn();
    window.localStorage.clear();
  });

  afterEach(() => {
    // Unmount while the media mocks are still in place; jsdom has no real pause/load.
    cleanup();
    vi.restoreAllMocks();
  });

  it("reads section by section, highlights the heading, and prefetches the next clip", async () => {
    render(<Page />);
    expect(screen.queryByLabelText("Lesson reader")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText("Listen to this section")).toHaveLength(2);

    fireEvent.click(screen.getByLabelText("Listen to this lesson"));
    await waitFor(() => expect(screen.getByText(/Reading · 1 of 4/)).toBeInTheDocument());
    expect(screen.getByText("Hashing", { selector: "p" })).toBeInTheDocument();
    // Intro clip plus the next one already requested.
    expect(fetchSpeech).toHaveBeenCalledTimes(2);
    expect(fetchSpeech.mock.calls[0][0]).toBe("Hashing. Intro paragraph.");

    fireEvent.click(screen.getByLabelText("Next section"));
    await waitFor(() => expect(screen.getByText(/Reading · 2 of 4/)).toBeInTheDocument());
    const heading = screen.getByRole("heading", { level: 2, name: /Mental Model/ });
    expect(heading.className).toContain("ring-1");
    expect(screen.getByLabelText("Reading this section")).toBeInTheDocument();
    expect(window.localStorage.getItem("anvil-tts-pos:lesson-1")).toBe("1");

    fireEvent.click(screen.getByLabelText("Pause"));
    expect(pause).toHaveBeenCalled();
    expect(screen.getByText(/Paused · 2 of 4/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Stop reading", { selector: "button[title='Stop']" }));
    expect(screen.queryByLabelText("Lesson reader")).not.toBeInTheDocument();
  });

  it("starts a single section from its heading button and moves on when the clip ends", async () => {
    render(<Page />);
    fireEvent.click(screen.getAllByLabelText("Listen to this section")[1]);
    await waitFor(() => expect(screen.getByText(/Reading · 3 of 4/)).toBeInTheDocument());
    expect(screen.getByText("How It Works", { selector: "p" })).toBeInTheDocument();

    const audio = document.querySelector("audio") ?? null;
    // The provider keeps its element off-DOM; grab it through the mocked play call instead.
    const element = (play.mock.instances.at(-1) ?? audio) as HTMLMediaElement;
    await act(async () => {
      element.onended?.(new Event("ended"));
    });
    await waitFor(() => expect(screen.getByText(/Reading · 4 of 4/)).toBeInTheDocument());
    expect(screen.getByText("Key takeaways", { selector: "p" })).toBeInTheDocument();
  });

  it("resumes from the saved position and remembers the chosen speed", async () => {
    window.localStorage.setItem("anvil-tts-pos:lesson-1", "2");
    render(<Page />);
    fireEvent.click(screen.getByLabelText("Listen to this lesson"));
    await waitFor(() => expect(screen.getByText(/Reading · 3 of 4/)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Reading speed"), { target: { value: "1.25" } });
    expect(window.localStorage.getItem("anvil-tts-speed")).toBe("1.25");
    const element = play.mock.instances.at(-1) as HTMLMediaElement;
    expect(element.playbackRate).toBe(1.25);
  });

  it("shows an error and resets when the audio cannot be fetched", async () => {
    fetchSpeech.mockRejectedValue(new Error("The reader is unavailable right now."));
    render(<Page />);
    fireEvent.click(screen.getByLabelText("Listen to this lesson"));
    await waitFor(() => expect(screen.queryByLabelText("Lesson reader")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Listen to this lesson")).toBeInTheDocument();
  });

  it("asks a signed-out user to sign in instead of fetching audio", async () => {
    const onLocked = vi.fn();
    render(<Page onLocked={onLocked} />);
    fireEvent.click(screen.getByLabelText("Listen to this lesson"));
    fireEvent.click(screen.getAllByLabelText("Listen to this section")[0]);
    expect(onLocked).toHaveBeenCalledTimes(2);
    expect(fetchSpeech).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Lesson reader")).not.toBeInTheDocument();
  });
});
