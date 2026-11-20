import { webcrypto } from "node:crypto";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { proxy } from "../proxy";
import { cleanName, normalizeRecordingBlob } from "./fileUtils";
import { scanMetadata, stripJpeg, stripMetadata, stripMp4, stripPng, stripWebp } from "./metadata";
import { buildResistanceDrop } from "./resistanceDrop";
import { generateSecureWordPassphrase } from "./passphrase";

const encoder = new TextEncoder();

function join(...parts: Uint8Array<ArrayBufferLike>[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function jpegSegment(marker: number, payload: Uint8Array): Uint8Array {
  const segment = new Uint8Array(payload.length + 4);
  segment.set([0xff, marker], 0);
  new DataView(segment.buffer).setUint16(2, payload.length + 2);
  segment.set(payload, 4);
  return segment;
}

function pngChunk(type: string, payload: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + payload.length);
  new DataView(chunk.buffer).setUint32(0, payload.length);
  chunk.set(encoder.encode(type), 4);
  chunk.set(payload, 8);
  return chunk;
}

function webpChunk(type: string, payload: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(8 + payload.length + (payload.length % 2));
  chunk.set(encoder.encode(type), 0);
  new DataView(chunk.buffer).setUint32(4, payload.length, true);
  chunk.set(payload, 8);
  return chunk;
}

function mp4Box(type: string, payload: Uint8Array): Uint8Array {
  const box = new Uint8Array(8 + payload.length);
  new DataView(box.buffer).setUint32(0, box.length);
  box.set(encoder.encode(type), 4);
  box.set(payload, 8);
  return box;
}

interface TestElement {
  value?: string;
  textContent?: string;
  hidden?: boolean;
  href?: string;
  children?: unknown[];
  onclick?: () => unknown;
  replaceChildren?: () => void;
  append?: (element: unknown) => void;
}

function runDropScript(html: string, password: string) {
  const script = /<script>\s*([\s\S]*?)\s*<\/script>/.exec(html)?.[1];
  if (!script) throw new Error("Drop script was not found");
  const blobs = new Map<string, Blob>();
  const output: TestElement = {
    children: [],
    replaceChildren() {
      this.children = [];
    },
    append(element) {
      this.children?.push(element);
    },
  };
  const elements: Record<string, TestElement> = {
    pw: { value: password },
    err: { textContent: "" },
    out: output,
    go: {},
    burn: { hidden: true },
  };
  const context = {
    Blob,
    Uint8Array,
    TextEncoder,
    TextDecoder,
    crypto: webcrypto,
    atob,
    btoa,
    document: {
      getElementById: (id: string) => elements[id],
      createElement: () => ({}),
    },
    window: { addEventListener() {} },
    URL: {
      createObjectURL(blob: Blob) {
        const url = `blob:test-${blobs.size}`;
        blobs.set(url, blob);
        return url;
      },
      revokeObjectURL(url: string) {
        blobs.delete(url);
      },
    },
  };
  vm.runInNewContext(script, context);
  return {
    elements,
    unlock: () => vm.runInNewContext("document.getElementById('go').onclick()", context),
    blobs,
  };
}

describe("Resistance Drop export", () => {
  it("normalizes WebM identification fields but preserves Cluster timecodes", async () => {
    const vintElement = (id: number[], payload: Uint8Array) =>
      join(Uint8Array.from(id), Uint8Array.of(0x80 | payload.length), payload);
    const info = vintElement(
      [0x15, 0x49, 0xa9, 0x66],
      join(
        vintElement([0x4d, 0x80], encoder.encode("MediaRecorder")),
        vintElement([0x57, 0x41], encoder.encode("Chromium")),
        vintElement([0x44, 0x61], new Uint8Array(8).fill(7)),
      ),
    );
    const cluster = vintElement(
      [0x1f, 0x43, 0xb6, 0x75],
      vintElement([0xe7], Uint8Array.of(0x2a)),
    );
    const segmentPayload = join(info, cluster);
    const segment = join(
      Uint8Array.of(0x18, 0x53, 0x80, 0x67),
      Uint8Array.of(0xff),
      segmentPayload,
    );
    const ebml = join(
      Uint8Array.of(0x1a, 0x45, 0xdf, 0xa3, 0x80),
      segment,
    );
    const blob = new Blob([ebml], { type: "video/webm" });
    const normalized = await normalizeRecordingBlob(blob);
    const output = new Uint8Array(await normalized.arrayBuffer());
    const text = new TextDecoder().decode(output);
    expect(text).not.toContain("MediaRecorder");
    expect(text).not.toContain("Chromium");
    const dateUtc = output.findIndex(
      (byte, index) => byte === 0x44 && output[index + 1] === 0x61 && output[index + 2] === 0x88
    );
    expect(Array.from(output.slice(dateUtc + 3, dateUtc + 11))).toEqual(new Array(8).fill(0));
    const timecode = output.findIndex(
      (byte, index) => byte === 0xe7 && output[index + 1] === 0x81
    );
    expect(output[timecode + 2]).toBe(0x2a);
  });

  it("generates six paired-word groups using independent random selections", () => {
    const passphrase = generateSecureWordPassphrase();
    const groups = passphrase.split(" ");
    expect(groups).toHaveLength(6);
    expect(groups.every((group) => group.split("-").length === 2)).toBe(true);
  });

  it("serializes hostile filenames without emitting script-breaking HTML", async () => {
    const hostileName = `photo</script><img src=x onerror=alert(1)>.jpg`;
    const drop = await buildResistanceDrop({
      blob: new Blob(["test"], { type: "image/jpeg" }),
      fileName: hostileName,
      password: "a sufficiently long passphrase",
      kind: "clean",
      stealth: true,
      meta: { GPSLatitude: "51.5" },
    });
    const html = await drop.text();

    expect(html).not.toContain(hostileName);
    expect(html).not.toContain("</script><");
  });

  it("authenticates non-stealth metadata and encrypted chunks on unlock", async () => {
    const clear = "private clip payload";
    const password = "a sufficiently long passphrase";
    const drop = await buildResistanceDrop({
      blob: new Blob([clear], { type: "application/octet-stream" }),
      fileName: "clip.webm",
      password,
      kind: "clean",
      stealth: false,
    });
    const html = await drop.text();
    const wrongPassword = runDropScript(html, "incorrect passphrase");
    await wrongPassword.unlock();
    expect(wrongPassword.elements.err?.textContent).toContain("Wrong passphrase");

    const valid = runDropScript(html, password);
    await valid.unlock();
    const output = valid.elements.out?.children?.[0] as TestElement;
    expect(await valid.blobs.get(output.href ?? "")?.text()).toBe(clear);

    const payloadMatch = /const PAYLOAD = (.*);\nconst AAD_PREFIX_V2/.exec(html);
    if (!payloadMatch) throw new Error("Drop payload was not found");
    const payload = JSON.parse(payloadMatch[1]);
    payload.fileName = "tampered-name.webm";
    const changedHeaderHtml = html.replace(
      `const PAYLOAD = ${payloadMatch[1]};`,
      `const PAYLOAD = ${JSON.stringify(payload)};`
    );
    const changedHeader = runDropScript(changedHeaderHtml, password);
    await changedHeader.unlock();
    expect(changedHeader.elements.err?.textContent).toContain("tampered");

    const chunkPayload = JSON.parse(payloadMatch[1]);
    const first = chunkPayload.data[0] as string;
    chunkPayload.data[0] = `${first[0] === "A" ? "B" : "A"}${first.slice(1)}`;
    const tamperedHtml = html.replace(
      `const PAYLOAD = ${payloadMatch[1]};`,
      `const PAYLOAD = ${JSON.stringify(chunkPayload)};`
    );
    const tampered = runDropScript(tamperedHtml, password);
    await tampered.unlock();
    expect(tampered.elements.err?.textContent).toContain("tampered");
  }, 30_000);

  it("uses a matching extension for cleaned raster output", () => {
    expect(cleanName("holiday.jpeg", "image/jpeg")).toBe("holiday_clean.jpg");
    expect(cleanName("holiday.png", "image/png")).toBe("holiday_clean.png");
    expect(cleanName("holiday.webp", "image/webp")).toBe("holiday_clean.webp");
  });

  it("rejects malformed WebP chunk sizes instead of looping", async () => {
    const malformed = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x0c, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x54, 0x45, 0x53, 0x54,
      0x00, 0x00, 0x00, 0x80,
    ]);
    const decodeFailure = new Error("Image decoding unavailable");
    const decode = vi.fn().mockRejectedValue(decodeFailure);
    vi.stubGlobal("createImageBitmap", decode);

    try {
      const file = new File([malformed], "malformed.webp", { type: "image/webp" });
      await expect(stripMetadata(file, [])).rejects.toThrow(decodeFailure.message);
      expect(decode).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  }, 1000);
});

describe("metadata container stripping", () => {
  it("uses checked-in fixtures and removes known JPEG, PNG, and WebP payloads", async () => {
    const fixtureDir = path.join(process.cwd(), "test-fixtures");
    const jpeg = new Uint8Array(fs.readFileSync(path.join(fixtureDir, "gps-xmp.jpg")));
    const png = new Uint8Array(fs.readFileSync(path.join(fixtureDir, "gps-c2pa.png")));
    const webp = new Uint8Array(fs.readFileSync(path.join(fixtureDir, "gps-c2pa.webp")));

    const cleanJpeg = new TextDecoder().decode(stripJpeg(jpeg));
    const cleanPng = new TextDecoder().decode(stripPng(png));
    const cleanWebp = new TextDecoder().decode(stripWebp(webp));

    expect(cleanJpeg).not.toContain("GPS");
    expect(cleanJpeg).not.toContain("XMP");
    expect(cleanJpeg).not.toContain("MOTION-PHOTO");
    expect(cleanPng).not.toContain("GPSLatitude");
    expect(cleanPng).not.toContain("C2PA-KNOWN-CREDENTIAL");
    expect(cleanWebp).not.toContain("GPSLatitude");
    expect(cleanWebp).not.toContain("C2PA-KNOWN-CREDENTIAL");
  });

  it("uses an MP4 fixture to detect gpmd metadata and embedded media payloads", () => {
    const fixture = new Uint8Array(
      fs.readFileSync(path.join(process.cwd(), "test-fixtures", "gps-gpmd.mp4"))
    );
    const stripped = stripMp4(fixture);
    expect(stripped.metadataHandlers).toEqual(["gpmd"]);
    expect(new TextDecoder().decode(stripped.data)).not.toContain("GPSLatitude");
    expect(new TextDecoder().decode(stripped.data)).toContain("EMBEDDED-GPS-METADATA");
  });

  it("removes JPEG metadata and truncates appended data at EOI", () => {
    const app1 = jpegSegment(0xe1, encoder.encode("XMP-METADATA"));
    const scan = new Uint8Array([0xff, 0xda, 0x00, 0x02, 0x11, 0xff, 0x00, 0x22, 0xff, 0xff, 0xd9]);
    const jpeg = join(new Uint8Array([0xff, 0xd8]), app1, scan, encoder.encode("MOTION-TRAILER"));
    const clean = stripJpeg(jpeg);
    const output = new TextDecoder().decode(clean);
    expect(output).not.toContain("XMP-METADATA");
    expect(output).not.toContain("MOTION-TRAILER");
    expect(Array.from(clean.slice(-2))).toEqual([0xff, 0xd9]);
    expect(Array.from(clean).some((byte, index) => byte === 0xff && clean[index + 1] === 0x00)).toBe(true);
  });

  it("keeps only structural PNG chunks and drops C2PA chunks", () => {
    const png = join(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      pngChunk("IHDR", new Uint8Array(13)),
      pngChunk("caBX", encoder.encode("C2PA-CREDENTIAL")),
      pngChunk("IDAT", encoder.encode("PIXELS")),
      pngChunk("IEND", new Uint8Array(0))
    );
    const output = new TextDecoder().decode(stripPng(png));
    expect(output).toContain("IHDR");
    expect(output).toContain("IDAT");
    expect(output).not.toContain("caBX");
    expect(output).not.toContain("C2PA-CREDENTIAL");
  });

  it("keeps only structural WebP chunks and drops C2PA chunks", () => {
    const body = join(
      webpChunk("VP8X", new Uint8Array(10)),
      webpChunk("C2PA", encoder.encode("C2PA-CREDENTIAL")),
      webpChunk("VP8 ", encoder.encode("PIXELS"))
    );
    const webp = new Uint8Array(12 + body.length);
    webp.set(encoder.encode("RIFF"), 0);
    new DataView(webp.buffer).setUint32(4, body.length + 4, true);
    webp.set(encoder.encode("WEBP"), 8);
    webp.set(body, 12);
    const clean = stripWebp(webp);
    const output = new TextDecoder().decode(clean);
    expect(output).toContain("VP8 ");
    expect(output).not.toContain("C2PA");
    expect(clean.length).toBeLessThan(webp.length);
  });

  it("reports embedded metadata-handler tracks in MP4", async () => {
    const handler = mp4Box(
      "hdlr",
      join(new Uint8Array(8), encoder.encode("gpmd"), new Uint8Array(12))
    );
    const udta = mp4Box("udta", encoder.encode("GPS-METADATA"));
    const moov = mp4Box("moov", mp4Box("trak", mp4Box("mdia", handler)));
    const input = join(mp4Box("ftyp", encoder.encode("isom")), moov, udta);
    const output = stripMp4(input);
    expect(output.metadataHandlers).toEqual(["gpmd"]);
    expect(new TextDecoder().decode(output.data)).not.toContain("GPS-METADATA");

    const traces = await scanMetadata(new File([input], "video.mp4", { type: "video/mp4" }));
    expect(traces.some((trace) => trace.key === "Metadata track (gpmd)")).toBe(true);
    const stripped = await stripMetadata(new File([input], "video.mp4", { type: "video/mp4" }), traces);
    expect(stripped.warnings?.some((warning) => warning.includes("gpmd"))).toBe(true);
  });
});

describe("CSP response", () => {
  it("sends a nonce CSP that permits MediaPipe WASM compilation", () => {
    const response = proxy(new NextRequest("https://veilzero.test/live"));
    const policy = response.headers.get("content-security-policy") ?? "";
    const scriptPolicy = policy.split(";").find((directive) => directive.trim().startsWith("script-src"));
    expect(scriptPolicy).toContain("script-src 'self'");
    expect(scriptPolicy).toContain("'wasm-unsafe-eval'");
    expect(scriptPolicy).toContain("'nonce-");
    expect(scriptPolicy).not.toContain("'unsafe-inline'");
  });
});
