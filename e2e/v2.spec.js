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
  await expect(page.locator('.swatch[data-role="warning"]')).toHaveCount(2);
  await expect(page.locator('.swatch[data-role="selection"]')).toHaveCount(2);
  await expect(page.locator(".example.light .craken-warning")).toBeVisible();
  await expect(page.locator(".example.dark .craken-popover")).toBeVisible();
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
  await expect(page.locator(".gallery-card")).toHaveCount(12, {
    timeout: 30_000,
  });
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
});
