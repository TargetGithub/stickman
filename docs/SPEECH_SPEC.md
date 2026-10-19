# Spoken dialogue (offline text-to-speech): spec

Status: draft 0.2 (2026-10-19), implemented in `tools/lib/tts/` (v1); voices await the listening review (section 8). Owner: Sridhar. Builds on STORY_SPEC 7.2 (dialogue), 15 (audio) and ADR-017 (babble speech).

## 1. Goal

Characters speak their lines out loud in real words, as well as showing them in bubbles. Narration can be read aloud too. Everything runs offline on the user's machine with free software. No paid or online service, and no language models.

Today every line plays **babble**: language-free syllables synthesized from the character's `voice` (`timbre`, `pitch`, `speed`) in `tools/lib/speech.mjs`. Babble stays the default. Spoken speech is opt-in per render, so existing scripts, renders and golden frames do not change.

## 2. Choices

| Decision | Choice | Why |
|---|---|---|
| Speech engine | **Piper** (`piper-tts` 1.8 from PyPI in a private venv, GPL-3.0, run as a separate program; the MIT 2023 macOS arm64 binary is broken), ONNX voices | Natural quality, fast on CPU, many English voices, deterministic when onnxruntime is seeded before each voice load |
| Fallback engine | none in v1 (a second backend can be added behind the same interface) | Keep v1 small |
| Where it runs | **tools only** (`tools/lib/tts/`), never in `/engine` | The engine has no I/O, network or processes (CLAUDE.md) |
| How the engine learns line lengths | the record tool sets `sayDur` on line beats and `dur` on narration before simulating | Both fields already exist; the engine stays pure |
| Caching | WAV per line in `assets/speech/cache/` (gitignored), keyed by a hash of backend, model, voice settings and text | Re-renders are instant and identical |
| Opt-in | `node tools/record.mjs <script> --speech tts` (default `babble`); optional `meta.speech: "babble" \| "tts"` in a script | No change to existing renders |

Other offline engines considered: Kokoro-82M (Apache 2.0, very natural, mostly English, heavier setup: a good second backend later), espeak-ng (GPL, robotic), macOS `say` (unclear terms for published videos), Coqui XTTS (non-commercial license: not allowed for a monetised channel).

**Licenses:** Piper itself is MIT. Each Piper voice model has its own license and dataset terms (listed in the voice's `MODEL_CARD`). Only voices whose license allows commercial use (for example CC BY, CC0, MIT, Apache) may be used for published videos; record the chosen voices and their licenses in `assets/speech/VOICES.md`.

## 3. Script and cast

No script rewrite is needed. Voices are chosen from the cast's existing `voice` block, with an optional new `tts` part:

```json
"voice": { "pitch": 1.35, "speed": 1, "timbre": "soft",
           "tts": { "model": "en_GB-jenny_dioco-medium", "speaker": 0, "rate": 1.0, "pitch": 2 } }
```

| Field | Meaning | Default |
|---|---|---|
| `tts.model` | Piper voice name | from the timbre table (section 5) |
| `tts.speaker` | speaker id in a multi-speaker model | 0 |
| `tts.rate` | speaking speed multiplier (Piper `length_scale = 1 / rate`) | `voice.speed` |
| `tts.pitch` | pitch shift in semitones, applied after synthesis (kids, Mooka) | derived from `voice.pitch` (section 5) |
| `tts.off` | `true`: this character keeps babble even in tts mode | `false` (Becky's `bark` timbre is always babble) |

`docs/schema/script-v2.schema.json` and `engine/validator/schema_v2.js` gain the optional `voice.tts` object (validator: known fields, ranges `rate` 0.5-2, `pitch` -12..12). The engine ignores it. Narration voice: `meta.narrator: { "model", "speaker", "rate", "pitch" }`, optional.

## 4. Pipeline (record tool, `--speech tts`)

1. **Compile** the script with the public API (`compileScript`) so macro lines (`@dialogue`) become plain beats with ids.
2. **Collect lines** (`tools/lib/tts/lines.mjs`): every beat with `say` (who, text, bubble) and every `narrate` world beat. Skip characters with `tts.off` or the `bark` timbre, and `think` bubbles (silent, as with babble). Beats without an id get `tts_<scene>_<beat>` so the sim's events can be matched to the line. A line the dialogue macro split into several bubbles (same speaker, chained with `after`, no sentence end between them) is spoken as one clip; its audio is shared out over the bubbles by length, and the later bubbles lose their babble. Text clean-up: strip stage-direction marks like `...` runs to a pause and keep `!`/`?` for intonation.
3. **Synthesize** (`tools/lib/tts/piper.mjs`): for each line, cache key = sha256 of `{backend, version, model, speaker, rate, pitch, noise, text}`. If the WAV exists in the cache, reuse it; else render it with Piper (`tools/lib/tts/piper_batch.py`: one Python process per voice model per render; for each line it seeds onnxruntime from the cache key and loads the voice, because Piper's noise comes from random ops seeded at load time) with fixed `noise_scale 0.333`, `noise_w 0.333`, so the same line always gives the same samples. Then pitch-shift with ffmpeg (`asetrate` + `atempo`, keeping duration) trim silence at both ends and level each clip to -16 LUFS (peaks under -1 dBFS). Bubble style: `shout` adds +2 dB and a slightly faster rate, `whisper` -6 dB and a soft high-pass.
4. **Durations**: measure each WAV. Set `sayDur = clamp(audio + 0.25, readingTime(text), 10)` on the beat; a `talk` beat loops its gesture (`cycles`) and a `wait` beat waits that long, so `after` anchors wait for the voice. Narration starts 0.3 s after its chime: `dur = clamp(audio + 0.7, narrateDuration, 15)`. Lines that do not fit are flagged (a warning and `long` in speech.json); v1 does not split them.
5. **Simulate and render** as today. Because lines now last as long as they are spoken, `after` anchors in dialogue keep speakers from talking over each other.
6. **Mix** (`tools/lib/mixer.mjs` `swapSpeech`): babble syllables and narration chimes carry `line` (their beat id); in tts mode the say events of spoken lines play their WAV (panned by the speaker's screen x, as babble is today) instead of babble syllables; narration plays its WAV with the narration chime softened. Music ducking under speech already exists and keys off the say events.
7. **Mouth**: mouths keep flapping from the line's syllables during the say window (unchanged). v2 option: drive the open amount from the WAV's loudness envelope (`speech.envelope` per say event).

Output: the same `final.mp4`, plus `speech.json` (line → cache file, duration, model) in the render folder for checking.

## 5. Default voices per timbre

| Timbre | Piper model (pick one with a commercial-use license; verify) | Pitch shift | Rate |
|---|---|---|---|
| `soft` (Doopi, Doomi, Dony, Tara, Nani) | a warm English voice, e.g. `en_US-amy-medium` or an Indian English voice | from `voice.pitch`: `round(12 * log2(pitch))`, capped at +6 | `voice.speed` |
| `squeaky` (Mooka, Tony, Kony, kids) | same family, higher | +4 to +7 | ×1.1 |
| `deep` (Peepa, Mayor, Thunda, Mallu, Kanta) | a male English voice, e.g. `en_US-ryan-medium` | from `voice.pitch` (negative) | `voice.speed` |
| `robot` (Ghoom) | any voice, then a ring-modulated "robot" filter (ffmpeg `afftfilt` or a vocoder chain) | -3 | ×0.9 |
| `bark` (Becky) | none: babble barks | n/a | n/a |

The table lives in `catalog/story/tts_voices.json` (data, with descriptions), so voices change without code changes; the build checks it like other catalog files.

## 6. Setup (one time, user approved)

- Piper: `python3 -m venv tools/bin/piper/venv && tools/bin/piper/venv/bin/pip install piper-tts==1.8.0` (gitignored; `PIPER_BIN` overrides), and the chosen voice `.onnx` + `.json` files into `assets/speech/models/` (gitignored). Downloads happen only after the user approves each file (name, source, size).
- `node tools/tts_setup.mjs --check` reports what is installed and missing. Without Piper, `--speech tts` stops with a clear message; babble still works.
- `node tools/tts_cast.mjs <script> --voices <file>` writes a voice sampler: the narrator names each character, who then says its first line.

## 7. Tests

- Unit (no Piper needed; a fake backend writes a sine WAV of length 0.06 s per character): line collection from compiled stories (dialogue macro lines, narration, `tts.off`, bark), cache keys (stable, change with any setting), duration injection (`sayDur` clamped, narration `dur`, W_DIALOGUE_FAST stays clear), mixer swaps babble for clips only for spoken lines.
- Integration (skipped when Piper is missing): one short sample renders with real speech; the second run hits the cache for every line and produces identical audio.
- Validator: bad fixture for `voice.tts` fields out of range.

## 8. Review checkpoint

A demo render of **Doopi & Friends episode 1** with `--speech tts` into `out/demos/ep01_tts/`, **without changing** `scripts/series/doopi/ep01.json` (voices come from section 5 defaults; any per-character choice goes in a separate override file `series/doopi/tts_voices.json` passed with `--voices`). Plus a 30-second voice sampler (`out/demos/tts_cast.wav`: each main character says one line). Stop for Sridhar's listening review before wiring voices into the episode scripts or re-rendering the series.

## 9. Out of scope (v1)

Lip-sync visemes, emotions in the voice beyond rate/volume for `shout`/`whisper`, Hindi lines, cloud TTS, voice cloning.
