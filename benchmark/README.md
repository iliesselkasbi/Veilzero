# Face-privacy benchmark

Use a real, same-person source/processed image pair set. Matching files must
have the same relative path in `original/` and `processed/`.

```bash
pip install face-recognition
python scripts/benchmark-face-privacy.py \
  --original benchmark/original \
  --processed benchmark/processed
```

The script uses the open-source `face_recognition` package (dlib) and reports
128-D cosine distances and the fraction below the selected threshold. It does
not establish that the 0.6 threshold is appropriate for every threat model.
No public benchmark claims are made until measured pairs and the exact library
version are committed.
