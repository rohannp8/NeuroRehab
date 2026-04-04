"""
M06 — Neural TTS Voice Coach (Coqui TTS)

Speaks exercise instructions and correction prompts in a selected language.
Uses pre-trained Coqui models (VITS/XTTS family), no custom training required.

Key API:
    speak(phrase_key, lang_code, params={}) -> str(path_to_wav)

Example:
    coach = VoiceCoachTTS()
    coach.precache_common_phrases("en")
    coach.speak("bend_joint", "en", {"joint": "knee", "angle": 90})
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

try:
    from TTS.api import TTS as CoquiTTS  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - graceful runtime fallback
    CoquiTTS = None

try:
    import pygame  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - graceful runtime fallback
    pygame = None


DEFAULT_LANG = "en"

# Language -> preferred model name fallback chain (most stable first).
MODEL_CANDIDATES: dict[str, list[str]] = {
    "en": [
        "tts_models/en/ljspeech/vits",
        "tts_models/en/ljspeech/tacotron2-DDC",
    ],
    "hi": [
        "tts_models/hi/fairseq/vits",
    ],
    "mr": [
        "tts_models/multilingual/multi-dataset/xtts_v2",
    ],
    "ta": [
        "tts_models/ta/fairseq/vits",
        "tts_models/multilingual/multi-dataset/xtts_v2",
    ],
    "te": [
        "tts_models/te/fairseq/vits",
        "tts_models/multilingual/multi-dataset/xtts_v2",
    ],
}

PHRASE_TEMPLATES: dict[str, dict[str, str]] = {
    "good_form": {
        "en": "Good form. Keep going.",
        "hi": "Accha form hai. Aise hi chalte raho.",
        "mr": "Changle form aahe. Asech suru theva.",
        "ta": "Nalla form irukku. Thodarnthu seiyungal.",
        "te": "Manchi form undi. Alane konasaginchandi.",
    },
    "bad_form": {
        "en": "Your form is off. Please adjust your posture.",
        "hi": "Aapka form thoda galat hai. Kripya posture theek karein.",
        "mr": "Tumcha form chukicha aahe. Krupaya posture sudhara.",
        "ta": "Ungal form sariyaga illai. Posture-ai sari seiyungal.",
        "te": "Mee form tappuga undi. Dayachesi posture sari chesukondi.",
    },
    "bend_joint": {
        "en": "Bend your {joint} to {angle} degrees.",
        "hi": "Apna {joint} {angle} degree tak modiye.",
        "mr": "Tumcha {joint} {angle} degree paryant vaka.",
        "ta": "Ungal {joint}-ai {angle} degree varai madakkungal.",
        "te": "Mee {joint} ni {angle} degree varaku vankandi.",
    },
    "straighten_joint": {
        "en": "Straighten your {joint} a little more.",
        "hi": "Apna {joint} thoda aur seedha kijiye.",
        "mr": "Tumcha {joint} thoda adhik saral kara.",
        "ta": "Ungal {joint}-ai konjam innum neraaga seiyungal.",
        "te": "Mee {joint} ni inkonchem nittaruga chesukondi.",
    },
    "slow_down": {
        "en": "Slow down and control the movement.",
        "hi": "Thoda dheere karein aur movement control karein.",
        "mr": "Thoda halu kara ani movement control kara.",
        "ta": "Konjam methuvaga seithu movement-ai control pannungal.",
        "te": "Konchem mellaga chesi movement ni control lo pettandi.",
    },
    "take_rest": {
        "en": "You look tired. Take a short rest.",
        "hi": "Aap thake hue lag rahe hain. Thoda rest lijiye.",
        "mr": "Tumhi thaklele disata. Thoda visava ghya.",
        "ta": "Neengal saerndhupoyirukkireergal. Siridhu oivu edungal.",
        "te": "Meeru alisipoyaru. Konchem visranthi teesukondi.",
    },
    "start_exercise": {
        "en": "Start the exercise now.",
        "hi": "Ab exercise shuru karein.",
        "mr": "Ata vyayam suru kara.",
        "ta": "Ippove payirchiya thodangungal.",
        "te": "Ippude exercise modalupettandi.",
    },
    "stop_exercise": {
        "en": "Stop now and relax.",
        "hi": "Ab ruk jaiye aur relax kijiye.",
        "mr": "Ata thaamba ani relax vha.",
        "ta": "Ippodu niruththi saerndhungal.",
        "te": "Ippudu aapi konchem relax avvandi.",
    },
    "count_rep": {
        "en": "Rep number {count}.",
        "hi": "Rep number {count}.",
        "mr": "Rep number {count}.",
        "ta": "Rep number {count}.",
        "te": "Rep number {count}.",
    },
    "keep_breathing": {
        "en": "Keep breathing steadily.",
        "hi": "Saans ko niyamit rakhein.",
        "mr": "Shwas niyamit theva.",
        "ta": "Uzhaippin podhu saatchiyaga moochu vidungal.",
        "te": "Nidhananga saas teesukuntu undandi.",
    },
}


class VoiceCoachTTS:
    def __init__(
        self,
        cache_dir: str | Path = "tts_cache",
        use_gpu: bool = False,
        autoplay: bool = True,
    ):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.use_gpu = use_gpu
        self.autoplay = autoplay
        self._engines: dict[str, Any] = {}

    def _candidate_models(self, lang_code: str) -> list[str]:
        if lang_code in MODEL_CANDIDATES:
            return MODEL_CANDIDATES[lang_code]
        # Unknown language falls back to English model.
        return MODEL_CANDIDATES[DEFAULT_LANG]

    def _load_engine_for_language(self, lang_code: str):
        if CoquiTTS is None:
            raise RuntimeError(
                "Coqui TTS is not installed. Install requirements first: pip install TTS torch torchaudio"
            )

        if lang_code in self._engines:
            return self._engines[lang_code]

        last_error = None
        for model_name in self._candidate_models(lang_code):
            try:
                engine = CoquiTTS(model_name=model_name, progress_bar=False, gpu=self.use_gpu)
                self._engines[lang_code] = engine
                return engine
            except Exception as exc:  # pragma: no cover - runtime dependent
                last_error = exc

        raise RuntimeError(
            f"Unable to load TTS model for language '{lang_code}'. Last error: {last_error}"
        )

    @staticmethod
    def _safe_hash_name(text: str, lang_code: str) -> str:
        h = hashlib.sha1(f"{lang_code}::{text}".encode("utf-8")).hexdigest()[:16]
        return f"{lang_code}_{h}.wav"

    @staticmethod
    def _render_template(phrase_key: str, lang_code: str, params: dict[str, Any] | None) -> str:
        params = params or {}
        lang_map = PHRASE_TEMPLATES.get(phrase_key)
        if not lang_map:
            raise KeyError(f"Unknown phrase_key: {phrase_key}")

        template = lang_map.get(lang_code) or lang_map.get(DEFAULT_LANG)
        if template is None:
            raise KeyError(f"No template found for phrase '{phrase_key}'")

        try:
            return template.format(**params)
        except KeyError as exc:
            raise KeyError(f"Missing template param: {exc}") from exc

    @staticmethod
    def _play_wav(path: Path):
        if pygame is None:
            return
        if not pygame.mixer.get_init():
            pygame.mixer.init()
        pygame.mixer.music.load(str(path))
        pygame.mixer.music.play()

    def _tts_to_file(self, engine: Any, text: str, out_path: Path, lang_code: str):
        kwargs: dict[str, Any] = {}

        # Some multilingual models accept language=..., monolingual ones do not.
        if getattr(engine, "is_multi_lingual", False):
            kwargs["language"] = lang_code

        try:
            engine.tts_to_file(text=text, file_path=str(out_path), **kwargs)
        except TypeError:
            # Retry without optional kwargs for model API compatibility.
            engine.tts_to_file(text=text, file_path=str(out_path))

    def speak(
        self,
        phrase_key: str,
        lang_code: str,
        params: dict[str, Any] | None = None,
        play: bool | None = None,
        force_regenerate: bool = False,
    ) -> str:
        """
        Convert phrase template to speech, optionally play locally, return wav path.
        """
        text = self._render_template(phrase_key, lang_code, params)
        out_path = self.cache_dir / self._safe_hash_name(text, lang_code)

        if force_regenerate or not out_path.exists():
            engine = self._load_engine_for_language(lang_code)
            self._tts_to_file(engine, text, out_path, lang_code)

        if play if play is not None else self.autoplay:
            self._play_wav(out_path)

        return str(out_path)

    def get_audio_bytes(
        self,
        phrase_key: str,
        lang_code: str,
        params: dict[str, Any] | None = None,
    ) -> bytes:
        """
        Return generated WAV bytes for websocket/binary streaming use cases.
        """
        wav_path = Path(self.speak(phrase_key, lang_code, params=params, play=False))
        return wav_path.read_bytes()

    def precache_common_phrases(self, lang_code: str, top_n: int = 10) -> list[str]:
        """
        Pre-generate top-N phrase templates to avoid first-use latency.
        """
        generated = []
        for phrase_key in list(PHRASE_TEMPLATES.keys())[: max(1, top_n)]:
            default_params = {
                "joint": "knee",
                "angle": 90,
                "count": 1,
            }
            p = self.speak(phrase_key, lang_code, params=default_params, play=False)
            generated.append(p)
        return generated


def _parse_params(param_items: list[str]) -> dict[str, Any]:
    params: dict[str, Any] = {}
    for item in param_items:
        if "=" not in item:
            continue
        k, v = item.split("=", 1)
        # Try int/float coercion for common slot values.
        if v.isdigit():
            params[k] = int(v)
            continue
        try:
            params[k] = float(v)
            continue
        except ValueError:
            pass
        params[k] = v
    return params


def main():
    parser = argparse.ArgumentParser(description="M06 Neural TTS Voice Coach")
    parser.add_argument("--phrase", default="good_form", help="Phrase key")
    parser.add_argument("--lang", default="en", help="ISO language code")
    parser.add_argument("--param", action="append", default=[], help="Template param key=value")
    parser.add_argument("--cache-dir", default="tts_cache")
    parser.add_argument("--no-play", action="store_true")
    parser.add_argument("--precache", action="store_true", help="Pre-cache common phrases and exit")
    parser.add_argument("--top-n", type=int, default=10)
    parser.add_argument("--gpu", action="store_true")
    args = parser.parse_args()

    coach = VoiceCoachTTS(cache_dir=args.cache_dir, use_gpu=args.gpu, autoplay=not args.no_play)

    if args.precache:
        paths = coach.precache_common_phrases(args.lang, top_n=args.top_n)
        print(json.dumps({"cached": len(paths), "files": paths}, indent=2))
        return

    params = _parse_params(args.param)
    wav_path = coach.speak(args.phrase, args.lang, params=params)
    print(wav_path)


if __name__ == "__main__":
    main()
