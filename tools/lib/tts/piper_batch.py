# Piper batch renderer for tools/lib/tts/piper.mjs (SPEECH_SPEC 4.3), run with the venv's python.
# stdin: JSON {"model", "config", "jobs": [{"text", "out", "speaker", "length_scale", "noise_scale", "noise_w", "sentence_silence", "seed"}]}
# Piper's noise comes from random ops inside the voice model, which onnxruntime seeds when the model is
# loaded. So each job seeds and loads the voice afresh (about a second): the same job always gives the same
# samples, whatever else is in the batch. One process per batch still saves the Python start-up per line.
import json
import sys
import wave

import onnxruntime
from piper import PiperVoice, SynthesisConfig


def main():
    req = json.load(sys.stdin)
    for job in req["jobs"]:
        onnxruntime.set_seed(int(job["seed"]))
        voice = PiperVoice.load(req["model"], config_path=req["config"])
        cfg = SynthesisConfig(speaker_id=job["speaker"], length_scale=job["length_scale"], noise_scale=job["noise_scale"], noise_w_scale=job["noise_w"])
        rate = voice.config.sample_rate
        pause = b"\x00\x00" * int(rate * float(job.get("sentence_silence", 0)))
        with wave.open(job["out"], "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(rate)
            for i, chunk in enumerate(voice.synthesize(job["text"], syn_config=cfg)):
                if i:
                    w.writeframes(pause)  # a pause between sentences (moods: sad, tired, smug)
                w.writeframes(chunk.audio_int16_bytes)
        print(job["out"], flush=True)


if __name__ == "__main__":
    main()
