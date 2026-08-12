import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("generates both modes from one primary and exposes new semantic roles", async ({
  page,
}) => {
  await page.locator("#v2-primary").fill("#7A4ED8");
  await page.getByRole("button", { name: "Generate palette" }).click();
  await expect(page.locator("#palette-title")).toContainText("#7A4ED8");
  await expect(page.locator('.swatch[data-role="warning"]')).toHaveCount(1);
  await expect(page.locator('.swatch[data-role="selection"]')).toHaveCount(1);
  await expect(page.locator('.swatch[data-role="brand source"]')).toHaveCount(
    1,
  );
  await expect(page.locator('.swatch[data-role="primary border"]')).toHaveCount(
    1,
  );
  await expect(page.locator(".example.light .craken-warning")).toBeVisible();
  await expect(page.locator(".example.dark")).toHaveCount(0);
});

test("result mode switches the complete inspector and persists", async ({
  page,
}) => {
  const dark = page.getByRole("button", { name: "Dark", exact: true });
  await dark.click();
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".palette.dark")).toBeVisible();
  await expect(page.locator(".palette.light")).toHaveCount(0);
  await expect(page.locator(".foundation-map-card")).toHaveCount(1);
  await expect(page.locator(".example.dark")).toBeVisible();
  await page.reload();
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".palette.dark")).toBeVisible();

  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.locator(".palette")).toHaveCount(2);
  await expect(page.locator(".foundation-map-card")).toHaveCount(2);
  await expect(page.locator(".pair-decision")).toBeVisible();
});

test("result mode control remains usable without mobile overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const dark = page.getByRole("button", { name: "Dark", exact: true });
  await expect(dark).toBeVisible();
  await dark.click();
  await expect(page.locator(".palette.dark")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("accessibility pass and independent review remain separate", async ({
  page,
}) => {
  await page.locator("#v2-primary").fill("#FFFF00");
  await page.getByRole("button", { name: "Generate palette" }).click();
  await expect(page.locator("#validation-summary")).toContainText(
    "palette contracts met",
  );
  await expect(page.locator("#quality")).toContainText(
    "Independent source fidelity",
  );
  await expect(page.locator("#quality .review")).not.toHaveCount(0);
});

test("foundation graph and palette evidence stay synchronized", async ({
  page,
}) => {
  const node = page.locator(
    '.foundation-node.selected[data-mode="light"][data-role="background"]',
  );
  await node.click();
  const swatch = page.locator(
    '.swatch[data-mode="light"][data-role="background"]',
  );
  await expect(swatch).toHaveAttribute("open", "");
  await expect(swatch.locator('[data-candidate-kind="selected"]')).toHaveClass(
    /graph-target/,
  );
  await swatch.locator(":scope > summary").click();
  await expect(node).toHaveClass(/active/);
});

test("gallery is lazy and designer ratings persist", async ({ page }) => {
  await expect(page.locator(".gallery-card")).toHaveCount(0);
  await page.locator("#gallery-panel summary").click();
  await expect(page.locator(".gallery-card")).toHaveCount(14, {
    timeout: 30_000,
  });
  await expect(page.locator(".gallery-convergence").first()).toBeVisible();
  const first = page.locator(".gallery-card").first();
  await first.getByRole("button", { name: "Prefer" }).click();
  await expect(first.getByRole("button", { name: "Prefer" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await page.locator("#gallery-panel summary").click();
  await expect(
    page
      .locator(".gallery-card")
      .first()
      .getByRole("button", { name: "Prefer" }),
  ).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 });
});

test("invalid input is announced without replacing the current palette", async ({
  page,
}) => {
  const title = await page.locator("#palette-title").textContent();
  await page.locator("#v2-primary").fill("red");
  await page.getByRole("button", { name: "Generate palette" }).click();
  await expect(page.locator("#v2-error")).toContainText("six-digit hex");
  await expect(page.locator("#v2-primary")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#palette-title")).toHaveText(title);
});

test("worker calculation remains responsive and reports its duration", async ({
  page,
}) => {
  await page.locator("#v2-primary").fill("#00FFFF");
  await page.getByRole("button", { name: "Generate palette" }).click();
  await expect(page.locator("#calculation-status")).toContainText(
    "off the UI thread",
  );
  await expect(page.locator("#palette-title")).toContainText("#00FFFF");
});

test("core palette and Craken specimen retain their visual structure", async ({
  page,
}) => {
  await expect(page.locator(".palettes")).toHaveScreenshot(
    "single-mode-palette.png",
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.12,
    },
  );
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.locator(".palettes")).toHaveScreenshot(
    "paired-palettes.png",
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.12,
    },
  );
  await expect(page.locator(".examples")).toHaveScreenshot(
    "craken-specimens.png",
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.12,
    },
  );
  await expect(page.locator("#semantic-map")).toHaveScreenshot(
    "semantic-search-maps.png",
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.12,
    },
  );
  await expect(page.locator("#foundation-map")).toHaveScreenshot(
    "foundation-search-rows.png",
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.12,
    },
  );
  await expect(page.locator("#quality")).toHaveScreenshot(
    "independent-review.png",
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.12,
    },
  );
});
