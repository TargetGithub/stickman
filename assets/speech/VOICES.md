# Spoken voices: what is installed and under which license

Spoken dialogue (`node tools/record.mjs <script> --speech tts`, docs/SPEECH_SPEC.md) uses Piper voice models in
`assets/speech/models/` (gitignored). Only voices whose license allows commercial use (a monetised channel)
are allowed. Check `node tools/tts_setup.mjs --check` for what is installed.

| Voice | Used for | Dataset | License | Base model | Source |
|---|---|---|---|---|---|
| `en_US-kristin-medium` | `soft` timbre; Doomi, Nani, Tony | LibriVox recordings | public domain | trained from scratch | huggingface.co/rhasspy/piper-voices `en/en_US/kristin/medium/` |
| `en_GB-cori-medium` | `squeaky` timbre, narrator; Mooka, Pinky, Kony | LibriVox recordings | public domain | trained from scratch | `en/en_GB/cori/medium/` |
| `en_US-norman-medium` | not used: it garbles short sentences ("Very far." comes out as 3.6 s of noise) | LibriVox recordings | public domain | trained from scratch | `en/en_US/norman/medium/` |
| `en_US-john-medium` | `deep` (pitched down) and `robot` timbres; Doopi, Dony, Chintu, Mayor Motumal, Peepa | LibriVox recordings | public domain | fine-tuned from kristin | `en/en_US/john/medium/` |

Each licence is as stated in the voice's `MODEL_CARD` in rhasspy/piper-voices (read 2026-10-19). Files: one
`<voice>.onnx` (63.5 MB) and one `<voice>.onnx.json` (5 KB) per voice.

Not used:
- Most other English Piper voices (amy, ryan, lessac, hfc_*, kusal, jenny_dioco, alan, joe, libritts_r, vctk,
  northern_english_male, arctic) have a non-commercial license or an unclear one, or they are fine-tuned from the
  lessac voice, whose Blizzard 2013 dataset license was not confirmed for commercial use.
- en_GB-southern_english_female-low (CC BY-SA) is fine-tuned from ryan, which is non-commercial.

**Speech engine:** `piper-tts` 1.8.0 from PyPI (OHF-Voice/piper1-gpl, GPL-3.0), installed into
`tools/bin/piper/venv` (gitignored) with `python3 -m venv tools/bin/piper/venv && tools/bin/piper/venv/bin/pip install piper-tts==1.8.0`.
StickMan runs it as a separate program and does not ship it, so the GPL does not apply to StickMan's code or to
the audio it makes. The MIT rhasspy/piper 2023.11.14-2 macOS arm64 release was tried first. It is broken: the
binary is x86_64 and its libraries are missing.
