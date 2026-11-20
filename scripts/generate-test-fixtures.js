/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const outDir = path.join(__dirname, "..", "test-fixtures");
fs.mkdirSync(outDir, { recursive: true });

const text = (value) => new TextEncoder().encode(value);

function concat(parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function u16(value) {
  return Uint8Array.of((value >> 8) & 0xff, value & 0xff);
}

function pngChunk(type, payload) {
  const chunk = new Uint8Array(12 + payload.length);
  new DataView(chunk.buffer).setUint32(0, payload.length);
  chunk.set(text(type), 4);
  chunk.set(payload, 8);
  return chunk;
}

function jpegSegment(marker, payload) {
  return concat([Uint8Array.of(0xff, marker), u16(payload.length + 2), payload]);
}

function webpChunk(type, payload) {
  const chunk = new Uint8Array(8 + payload.length + (payload.length % 2));
  chunk.set(text(type), 0);
  new DataView(chunk.buffer).setUint32(4, payload.length, true);
  chunk.set(payload, 8);
  return chunk;
}

function mp4Box(type, payload) {
  const box = new Uint8Array(8 + payload.length);
  new DataView(box.buffer).setUint32(0, box.length);
  box.set(text(type), 4);
  box.set(payload, 8);
  return box;
}

async function main() {
  const pixels = Uint8Array.from([
    255, 0, 0, 255,
    0, 255, 0, 255,
    0, 0, 255, 255,
    255, 255, 255, 255,
  ]);

  const png = await sharp(pixels, { raw: { width: 2, height: 2, channels: 4 } }).png().toBuffer();
  const pngBytes = new Uint8Array(png);
  let iend = pngBytes.length - 12;
  const pngProbed = concat([
    pngBytes.subarray(0, iend),
    pngChunk("tEXt", text("GPSLatitude=51.5")),
    pngChunk("caBX", text("C2PA-KNOWN-CREDENTIAL")),
    pngChunk("iCCP", text("Device profile")),
    pngBytes.subarray(iend),
  ]);
  fs.writeFileSync(path.join(outDir, "gps-c2pa.png"), pngProbed);

  const jpeg = await sharp(pixels, { raw: { width: 2, height: 2, channels: 4 } }).jpeg({ quality: 90 }).toBuffer();
  const jpegBytes = new Uint8Array(jpeg);
  const jpegProbed = concat([
    jpegBytes.subarray(0, 2),
    jpegSegment(0xe1, text("EXIF-GPSLatitude=51.5")),
    jpegSegment(0xe1, text("XMP-LOCATION")),
    jpegBytes.subarray(2),
  ]);
  fs.writeFileSync(path.join(outDir, "gps-xmp.jpg"), jpegProbed);

  const webp = await sharp(pixels, { raw: { width: 2, height: 2, channels: 4 } }).webp({ quality: 90 }).toBuffer();
  const webpBytes = new Uint8Array(webp);
  const webpBody = webpBytes.subarray(12);
  const bodyWithProbes = concat([
    webpChunk("EXIF", text("GPSLatitude=51.5")),
    webpChunk("C2PA", text("C2PA-KNOWN-CREDENTIAL")),
    webpBody,
  ]);
  const webpProbed = new Uint8Array(12 + bodyWithProbes.length);
  webpProbed.set(text("RIFF"), 0);
  new DataView(webpProbed.buffer).setUint32(4, bodyWithProbes.length + 4, true);
  webpProbed.set(text("WEBP"), 8);
  webpProbed.set(bodyWithProbes, 12);
  fs.writeFileSync(path.join(outDir, "gps-c2pa.webp"), webpProbed);

  const handlerPayload = concat([new Uint8Array(8), text("gpmd"), new Uint8Array(12)]);
  const mp4 = concat([
    mp4Box("ftyp", text("isom")),
    mp4Box("moov", mp4Box("trak", mp4Box("mdia", mp4Box("hdlr", handlerPayload)))),
    mp4Box("udta", text("GPSLatitude=51.5")),
    mp4Box("mdat", text("EMBEDDED-GPS-METADATA")),
  ]);
  fs.writeFileSync(path.join(outDir, "gps-gpmd.mp4"), mp4);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
