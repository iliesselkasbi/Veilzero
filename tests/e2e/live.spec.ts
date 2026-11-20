import { expect, test } from "@playwright/test";

test("CSP permits local MediaPipe WASM compilation on the live route", async ({ page }) => {
  const cspErrors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (/Content Security Policy|CSP|WebAssembly|WASM/i.test(text)) {
      cspErrors.push(text);
    }
  });

  const documentResponse = await page.goto("/live");
  expect(documentResponse?.headers()["content-security-policy"]).toContain("'wasm-unsafe-eval'");
  await expect(page.getByRole("heading", { name: "VEILZERO LIVE" })).toBeVisible();
  await page.getByRole("button", { name: "Start camera" }).click();
  await expect(page.getByText(/Camera active|Camera access required/)).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByText(/Face: (Off|Obscured|Searching)/)).toBeVisible();

  const wasm = await page.evaluate(async () => {
    const response = await fetch("/mediapipe/face_mesh_solution_simd_wasm_bin.wasm");
    if (!response.ok) return { status: response.status, compiled: false };
    const compiledModule = await WebAssembly.compile(await response.arrayBuffer());
    return { status: response.status, compiled: compiledModule instanceof WebAssembly.Module };
  });
  expect(wasm).toEqual({ status: 200, compiled: true });
  await expect(page.getByText(/Face masking could not initialize/)).toHaveCount(0);

  expect(cspErrors).toEqual([]);
});
