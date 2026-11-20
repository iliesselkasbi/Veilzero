import { describe, expect, it, vi } from "vitest";
import { stripMetadata } from "./metadata";
import { buildResistanceDrop } from "./resistanceDrop";
import { cleanName } from "./fileUtils";

describe("Resistance Drop export", () => {
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
