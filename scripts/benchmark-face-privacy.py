#!/usr/bin/env python3
"""Optional open-source face-recognition benchmark using face_recognition/dlib.

Usage:
  python scripts/benchmark-face-privacy.py --original dir --processed dir

The script pairs files by relative path. It reports dlib 128-D cosine distance
and explicit recognition counts. It does not claim a pass/fail threshold; humans
must interpret the measured results for their threat model.
"""

import argparse
import sys
from pathlib import Path

try:
    import face_recognition
except ImportError:
    print("Missing dependency: install with `pip install face-recognition`", file=sys.stderr)
    raise SystemExit(2)


def encodings(path: Path):
    image = face_recognition.load_image_file(str(path))
    locations = face_recognition.face_locations(image)
    return face_recognition.face_encodings(image, locations)


def cosine(left, right):
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = sum(a * a for a in left) ** 0.5
    right_norm = sum(b * b for b in right) ** 0.5
    if left_norm == 0 or right_norm == 0:
        return 1.0
    return 1.0 - dot / (left_norm * right_norm)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--original", required=True, type=Path)
    parser.add_argument("--processed", required=True, type=Path)
    parser.add_argument("--threshold", type=float, default=0.6)
    args = parser.parse_args()

    pairs = sorted(p.relative_to(args.original) for p in args.original.rglob("*") if p.is_file())
    measured = []
    for relative in pairs:
        source = args.original / relative
        result = args.processed / relative
        if not result.is_file():
            continue
        source_faces = encodings(source)
        result_faces = encodings(result)
        if not source_faces or not result_faces:
            continue
        distance = cosine(source_faces[0], result_faces[0])
        measured.append(distance)

    if not measured:
        print("No matched face pairs with detectable faces.")
        return 2

    mean = sum(measured) / len(measured)
    recognized = sum(distance < args.threshold for distance in measured)
    print(f"pairs={len(measured)}")
    print(f"mean_cosine_distance={mean:.6f}")
    print(f"recognized_below_{args.threshold:.2f}={recognized}")
    print(f"recognition_rate={recognized / len(measured):.6f}")


if __name__ == "__main__":
    raise SystemExit(main())
