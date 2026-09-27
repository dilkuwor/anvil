import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VoicePanel } from "@/components/buddy/voice-panel";
import { speakableChunks } from "@/lib/buddy";

const sendMock = vi.fn();
const transcribeMock = vi.fn();
vi.mock("@/lib/buddy", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/buddy")>();
  return {
    ...original,
    sendBuddyVoice: (...args: unknown[]) => sendMock(...args),
    transcribeAudio: (...args: unknown[]) => transcribeMock(...args),
  };
});

// The recorder hands the recording back through onRecording; the test triggers that by hand.
let recordingHandler:
  ((blob: Blob, filename: string) => Promise<void> | void) | null = null;
const recorderStart = vi.fn();
vi.mock("@/components/buddy/use-recorder", () => ({
  useRecorder: ({
    onRecording,
  }: {
    onRecording: (blob: Blob, filename: string) => Promise<void> | void;
  }) => {
    recordingHandler = onRecording;
    return {
      status: "idle",
      level: 0,
      start: recorderStart,
      stop: vi.fn(),
      supported: true,
    };
  },
}));

const enqueueMock = vi.fn();
const finishMock = vi.fn();
const replayMock = vi.fn();
let playerEnd: (() => void) | null = null;
vi.mock("@/components/buddy/use-voice-player", () => ({
  useVoicePlayer: ({ onEnd }: { onEnd: () => void }) => {
    playerEnd = onEnd;
    return {
      playing: false,
      enqueue: enqueueMock,
      finish: finishMock,
      stop: vi.fn(),
      replay: replayMock,
      unlock: vi.fn(),
    };
  },
}));

vi.mock("@/components/learn/markdown", () => ({
  TutorMarkdown: ({ content }: { content: string }) => (
    <div data-testid="reply">{content}</div>
  ),
}));

describe("speakableChunks", () => {
  it("cuts at sentence ends once a piece is long enough and reports where to continue", () => {
    const text =
      "Short one. This sentence is long enough to be spoken on its own. And the tail";
    const first = speakableChunks(text, 0);
    expect(first.chunks).toEqual([
      "Short one. This sentence is long enough to be spoken on its own.",
    ]);
    expect(text.slice(first.next).trim()).toBe("And the tail");
    expect(speakableChunks("Line one\nLine two", 0).chunks).toEqual([
      "Line one",
    ]);
  });
});

describe("VoicePanel", () => {
  beforeEach(() => {
    sendMock.mockReset();
    transcribeMock.mockReset();
    enqueueMock.mockReset();
    finishMock.mockReset();
    replayMock.mockReset();
    recorderStart.mockReset();
  });

  it("records on tap, transcribes, streams the answer, reads it aloud, and offers replay", async () => {
    transcribeMock.mockResolvedValue("What is a quorum?");
    sendMock.mockImplementation(
      async (_body: unknown, onDelta: (delta: string) => void) => {
        onDelta(
          "A quorum is the smallest number of replicas that must agree before a write counts. ",
        );
        onDelta("More than half is the usual choice.");
        return "A quorum is the smallest number of replicas that must agree before a write counts. More than half is the usual choice.";
      },
    );
    render(
      <VoicePanel
        pageContext={null}
        contextKind="general"
        contextId=""
        mode="ask"
      />,
    );

    expect(screen.getByText("Tap the mic and ask")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Speak your question" }),
    );
    expect(recorderStart).toHaveBeenCalled();
    expect(screen.getByText("Listening… pause to send")).toBeInTheDocument();

    await act(async () => {
      await recordingHandler?.(
        new Blob(["x"], { type: "audio/webm" }),
        "speech.webm",
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId("reply")).toHaveTextContent(
        "More than half is the usual choice.",
      ),
    );
    expect(screen.getByText("What is a quorum?")).toBeInTheDocument();
    expect(enqueueMock).toHaveBeenCalledWith(
      "A quorum is the smallest number of replicas that must agree before a write counts.",
    );
    expect(enqueueMock).toHaveBeenCalledWith(
      "More than half is the usual choice.",
    );
    expect(finishMock).toHaveBeenCalled();
    expect(screen.getByText("Speaking… tap to stop")).toBeInTheDocument();
    const body = sendMock.mock.calls[0][0] as {
      history: unknown[];
      context: { kind: string };
    };
    expect(body.history).toEqual([]);
    expect(body.context.kind).toBe("general");

    await act(async () => {
      playerEnd?.();
    });
    expect(screen.getByText("Tap the mic to ask more")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Replay the last answer" }),
    );
    expect(replayMock).toHaveBeenCalledWith([
      "A quorum is the smallest number of replicas that must agree before a write counts.",
      "More than half is the usual choice.",
    ]);
  });

  it("shows a message when nothing was recognised and returns to idle", async () => {
    transcribeMock.mockResolvedValue("");
    render(
      <VoicePanel
        pageContext={null}
        contextKind="general"
        contextId=""
        mode="ask"
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Speak your question" }),
    );
    await act(async () => {
      await recordingHandler?.(new Blob(["x"]), "speech.webm");
    });
    expect(
      screen.getByText("No words were recognised. Try again."),
    ).toBeInTheDocument();
    expect(screen.getByText("Tap the mic and ask")).toBeInTheDocument();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
