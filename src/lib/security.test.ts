import { describe, expect, it } from "vitest";
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
});
