# Test fixture provenance

The files in this directory are deterministic, locally encoded test probes.

- JPEG: encoded from a 2x2 RGBA pixel image with `EXIF-GPSLatitude` and
  `XMP-LOCATION` probe segments added after the SOI marker.
- PNG: encoded by Sharp, with `tEXt`, `caBX`, and `iCCP` probe chunks inserted
  before `IEND`.
- WebP: encoded by Sharp, with `EXIF` and `C2PA` probe chunks inserted in the
  RIFF container.
- MP4: a minimal container containing a `gpmd` handler track and embedded
  `GPSLatitude` / `EMBEDDED-GPS-METADATA` payload probes.

These fixtures verify parsing and known-payload removal paths. They are not
claims of independently recorded camera evidence and must not be treated as
proof of real-device metadata behavior.
