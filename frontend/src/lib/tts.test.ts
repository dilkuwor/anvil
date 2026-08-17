import { lessonSpeech, speakableText } from "@/lib/tts";

describe("tts text prep", () => {
  it("strips markdown for speech", () => {
    expect(speakableText("## Hello **world** and [link](/x)")).toBe("Hello world and link");
  });

  it("builds a lesson script", () => {
    const spoken = lessonSpeech({
      title: "Hash maps",
      short_description: "Lookups in constant time.",
      content: "Use a `HashMap` for complements.",
      takeaways: ["State the key."],
    });
    expect(spoken).toContain("Hash maps");
    expect(spoken).toContain("HashMap");
    expect(spoken).toContain("Key takeaways");
  });
});
