import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("@smoke generates both modes from one primary and exposes new semantic roles", async ({
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
  await expect(page.locator(".color-group[open]")).toHaveCount(0);
  await page
    .locator(".color-group > summary")
    .filter({ hasText: "Brand" })
    .click();
  await expect(
    page.locator('.swatch[data-role="brand source"] .swatch-copy strong'),
  ).toHaveText("Original input");
  await expect(page.locator('.swatch[data-role="primary border"]')).toHaveCount(
    1,
  );
  await expect(page.locator(".example.light .reference-warning")).toBeVisible();
  await expect(page.locator(".example.dark")).toHaveCount(0);
  await expect(
    page.locator(".example-section + .palette-section"),
  ).toBeVisible();
});

test("reference export stays generic and preserves the public token contract", async ({
  page,
}) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: (value) => (window.__copiedReference = value) },
    });
  });
  await page.getByRole("button", { name: "Copy reference JSON" }).click();
  const exported = await page.evaluate(() =>
    JSON.parse(window.__copiedReference),
  );
  expect(exported.schema).toBe("color-lab-reference-tokens-1");
  expect(exported.modes.light["color.action.primary"]).toMatch(
    /^#[0-9A-F]{6}$/,
  );
  expect(JSON.stringify(exported).toLowerCase()).not.toContain("craken");
});

test("the applied example exposes real primary and destructive interactions", async ({
  page,
}) => {
  const primary = page.getByRole("button", { name: "Save changes" });
  const state = page.locator(".reference-primary-playground output");
  await primary.hover();
  await expect(state).toHaveText("Hover");
  await primary.dispatchEvent("pointerdown");
  await primary.focus();
  await expect(state).toHaveText("Pressed");
  await primary.dispatchEvent("pointerup");
  await primary.click();
  await expect(state).toHaveText("Saved");
  await primary.press("Tab");
  await page.mouse.move(0, 0);
  await primary.focus();
  await expect(state).toHaveText("Focus");
  const width = await page
    .locator(".examples")
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).width));
  expect(width).toBeLessThanOrEqual(760);
  await expect(
    page.locator(
      '.example :is(button, textarea):not(.reference-primary-demo):not(.reference-destructive-demo):not([tabindex="-1"]), .example a[href]',
    ),
  ).toHaveCount(0);

  const destructive = page.locator(".reference-destructive-demo");
  await expect(destructive).toHaveText("Move to Trash");
  await destructive.click();
  await expect(page.locator(".reference-feedback")).toHaveAttribute(
    "data-moved",
    "true",
  );
  await expect(destructive).toHaveText("Undo move");
  await destructive.click();
  await expect(destructive).toHaveText("Move to Trash");
});

test("@smoke result mode switches the complete inspector and persists", async ({
  page,
}) => {
  const dark = page.getByRole("button", { name: "Dark", exact: true });
  await dark.click();
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(17, 19, 17)",
  );
  await expect(page.locator(".input-card")).toHaveCSS(
    "background-color",
    "rgb(25, 27, 25)",
  );
  await expect(page.locator(".palette.dark")).toBeVisible();
  await expect(page.locator(".palette.light")).toHaveCount(0);
  await expect(page.locator(".foundation-map-card")).toHaveCount(1);
  await expect(page.locator(".example.dark")).toBeVisible();
  await page.reload();
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(17, 19, 17)",
  );
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

test("automated contracts and diagnostic limits remain separate", async ({
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
  await expect(page.locator("#quality")).toContainText(
    "Declared measurable relations",
  );
  await expect(page.locator(".semantic-intent-review")).toContainText(
    "does not establish overall palette quality",
  );
  await expect(
    page.locator(".semantic-intent-review header strong"),
  ).toHaveText("12 satisfied · 0 needs review");
  await expect(page.locator(".hover-diagnostic-review")).toContainText(
    "Signals review priority",
  );
  await expect(page.locator(".hover-diagnostic-review")).toContainText(
    "CIEDE2000",
  );
  await expect(page.locator(".hover-diagnostic-review")).toContainText(
    "unclassified priority",
  );
  await expect(page.locator("#quality .review")).not.toHaveCount(0);
});

test("foundation graph and palette evidence stay synchronized", async ({
  page,
}) => {
  const node = page.locator(
    '.decision-marker.selected[data-mode="light"][data-role="background"][data-axis="lightness"]',
  );
  const swatch = page.locator(
    '.swatch[data-mode="light"][data-role="background"]',
  );
  const group = swatch.locator("xpath=ancestor::details[1]");
  await expect(group).not.toHaveAttribute("open", "");
  await node.click();
  await expect(group).toHaveAttribute("open", "");
  await expect(swatch).toBeVisible();
  await expect(swatch).toHaveAttribute("open", "");
  await expect(swatch.locator('[data-candidate-kind="selected"]')).toHaveClass(
    /graph-target/,
  );
  await swatch.locator(":scope > summary").click();
  await expect(node).toHaveClass(/active/);
});

test("compact palette remains expandable in mobile compare mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.locator(".palette")).toHaveCount(2);
  const firstGroup = page.locator(".color-group").first();
  await firstGroup.locator(":scope > summary").click();
  await expect(firstGroup).toHaveAttribute("open", "");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("gallery is lazy and keeps interactive diagnostic specimens", async ({
  page,
}) => {
  await expect(page.locator(".gallery-card")).toHaveCount(0);
  await page.locator("#gallery-panel summary").click();
  await expect(page.locator(".gallery-card")).toHaveCount(14, {
    timeout: 30_000,
  });
  await expect(page.locator("#hover-comparison")).toContainText(
    "Automated inspection shortlist",
  );
  await expect(page.locator(".hover-comparison-row.recommended")).toHaveCount(
    5,
  );
  await expect(page.locator("#hover-comparison")).toContainText(
    "No weighted score",
  );
  await expect(page.locator("#hover-comparison")).toContainText("DE00");
  const lightTrial = page
    .locator(".gallery-card")
    .first()
    .getByRole("button", { name: /Try Light primary/ });
  const defaultColor = await lightTrial.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await lightTrial.hover();
  await expect(
    lightTrial.locator("xpath=.././/b[contains(@class, 'hover')]"),
  ).toBeVisible();
  const hoverColor = await lightTrial.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(hoverColor).not.toBe(defaultColor);
  await page.mouse.down();
  const activeColor = await lightTrial.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(activeColor).not.toBe(hoverColor);
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await page.locator(".gallery-card .gallery-load").first().focus();
  await page.keyboard.press("Tab");
  await expect(lightTrial).toBeFocused();
  await expect(
    lightTrial.locator("xpath=.././/b[contains(@class, 'focus')]"),
  ).toBeVisible();
  await expect(lightTrial).toHaveCSS("outline-style", "solid");
  await page.locator("body").focus();
  await expect(page.locator(".gallery-card").first()).toHaveScreenshot(
    "interactive-diagnostic-card.png",
    { animations: "disabled", maxDiffPixelRatio: 0.12 },
  );
  await page.locator(".topbar").evaluate((element) => {
    element.style.display = "none";
  });
  await expect(page.locator("#hover-comparison")).toHaveScreenshot(
    "hover-inspection-shortlist.png",
    { animations: "disabled", maxDiffPixelRatio: 0.12 },
  );
  await page.locator(".topbar").evaluate((element) => {
    element.style.display = "";
  });
  await expect(page.locator(".gallery-convergence").first()).toBeVisible();
  await expect(page.locator(".gallery-trials button")).toHaveCount(28);
});

test("@smoke invalid input is announced without replacing the current palette", async ({
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

test("core palette and reference specimen retain their visual structure", async ({
  page,
}) => {
  await expect(page.locator(".palettes")).toHaveScreenshot(
    "single-mode-palette.png",
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.12,
    },
  );
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page).toHaveScreenshot("dark-mode-shell.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.12,
  });
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.locator(".palettes")).toHaveScreenshot(
    "paired-palettes.png",
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.12,
    },
  );
  await page.locator(".topbar").evaluate((element) => {
    element.style.display = "none";
  });
  await expect(page.locator(".examples")).toHaveScreenshot(
    "reference-specimens.png",
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.12,
    },
  );
  await page.locator(".topbar").evaluate((element) => {
    element.style.display = "";
  });
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
  await page.locator(".topbar").evaluate((element) => {
    element.style.display = "none";
  });
  await expect(page.locator("#quality")).toHaveScreenshot(
    "independent-review.png",
    {
      animations: "disabled",
      maxDiffPixelRatio: 0.12,
    },
  );
});
