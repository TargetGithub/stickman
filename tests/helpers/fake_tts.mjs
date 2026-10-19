// A fake TTS backend for tests (SPEECH_SPEC 7): a sine tone of 0.06 s per character of the spoken text,
// at a frequency from the voice's pitch, so tests run without Piper.
import { writeWav } from "../../tools/lib/wav.mjs";

export function fakeBackend({ version = "1" } = {}) {
  const calls = [];
  return {
    id: "fake",
    version,
    calls,
    render(line, outPath) {
      calls.push(line.id);
      const n = Math.round(0.06 * line.spoken.length * 48000);
      const f = 220 * 2 ** ((line.voice.pitch ?? 0) / 12);
      const x = new Float32Array(n);
      for (let i = 0; i < n; i++) x[i] = 0.3 * Math.sin((2 * Math.PI * f * i) / 48000);
      writeWav(outPath, x, 48000, 1);
    },
  };
}

/** A short story: a dialogue macro, an authored line, a thought, narration, a dog and a character that keeps babble. */
export function speechStory() {
  return {
    version: 2,
    meta: { title: "Speech fixture", format: "landscape", seed: 5, kind: "clip", audience: "kids" },
    cast: [
      { id: "kai", color: "#3fd8ff", voice: { pitch: 1.2, timbre: "soft" } },
      { id: "mo", color: "#ffd23f", voice: { pitch: 0.8, timbre: "deep", tts: { model: "custom-voice", rate: 1.2, pitch: -2 } } },
      { id: "rex", color: "#aa7744", voice: { timbre: "bark" } },
      { id: "zed", color: "#cccccc", voice: { timbre: "squeaky", tts: { off: true } } },
    ],
    locations: [{ id: "park", theme: "city_park" }],
    scenes: [{
      id: "one", location: "park",
      cast: [{ id: "kai", x: 1300, facing: 1 }, { id: "mo", x: 1700, facing: -1 }, { id: "rex", x: 900, facing: 1 }, { id: "zed", x: 2100, facing: -1 }],
      beats: [
        { id: "n1", at: 0.2, who: "world", do: "narrate", params: { text: "One sunny morning in the park..." } },
        { id: "talk", at: { after: "n1" }, macro: "dialogue", params: { lines: [["kai", "Hello there, my friend!"], ["mo", "HELLO! How are you today?"]] } },
        { id: "woof", at: { after: "talk" }, who: "rex", do: "nod", say: "Woof!" },
        { id: "zz", at: { after: "talk" }, who: "zed", do: "nod", say: "Me too!" },
        { id: "hmm", at: { after: "woof" }, who: "kai", do: "talk", say: "Hmm...", bubble: "think" },
        { id: "bye", at: { after: "hmm" }, who: "kai", do: "talk", say: "See you later!", bubble: "shout" },
      ],
    }],
  };
}
