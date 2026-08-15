import argparse
import json
import os
import sys


def main():
    ap = argparse.ArgumentParser(prog="gen_sidecar")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p_music = sub.add_parser("music")
    p_music.add_argument("--out", required=True)
    p_music.add_argument("--mood", default="calm")
    p_music.add_argument("--bpm", type=int, default=90)
    p_music.add_argument("--bars", type=int, default=12)
    p_music.add_argument("--seed", type=int, default=11)

    p_tts = sub.add_parser("tts")
    p_tts.add_argument("--out", required=True)
    p_tts.add_argument("--text", required=True)
    p_tts.add_argument("--voice", default="Samantha")
    p_tts.add_argument("--rate", type=int, default=165)
    p_tts.add_argument("--provider", choices=["say", "elevenlabs"], default="say")
    p_tts.add_argument("--model", default="eleven_multilingual_v2")
    p_tts.add_argument("--stability", type=float, default=0.5)
    p_tts.add_argument("--similarity-boost", type=float, default=0.75)
    p_tts.add_argument("--voice-style", type=float, default=0)
    p_tts.add_argument("--no-speaker-boost", action="store_true")

    p_sfx = sub.add_parser("sfx")
    p_sfx.add_argument("--out", required=True)
    p_sfx.add_argument("--kind", default="whoosh")
    p_sfx.add_argument("--seed", type=int, default=0)

    sub.add_parser("doctor")

    args = ap.parse_args()
    if args.cmd == "music":
        from .music import generate_music

        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        result = generate_music(args.out, args.mood, args.bpm, args.bars, args.seed)
    elif args.cmd == "tts":
        from .tts import generate_tts

        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        result = generate_tts(
            args.out,
            args.text,
            args.voice,
            args.rate,
            args.provider,
            args.model,
            {
                "stability": args.stability,
                "similarity_boost": args.similarity_boost,
                "style": args.voice_style,
                "use_speaker_boost": not args.no_speaker_boost,
            },
        )
    elif args.cmd == "sfx":
        from .sfx import generate_sfx

        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        result = generate_sfx(args.out, args.kind, args.seed)
    else:
        from .doctor import probe

        result = probe()
    print(json.dumps(result))
    sys.exit(0 if result.get("ok") else 1)


if __name__ == "__main__":
    main()
