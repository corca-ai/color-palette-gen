import { expect, test } from "@playwright/test";
import {
  contrastRatio,
  hexToRgb,
  rgbToHex,
  rgbToOklch,
} from "../lib/color-math.js";

function renderedColorToHex(value) {
  const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
  const scale = value.startsWith("color(srgb") ? 1 : 255;
  return rgbToHex({
    r: channels[0] / scale,
    g: channels[1] / scale,
    b: channels[2] / scale,
  });
}

async function interactiveButtonColors(page, button) {
  const read = () =>
    button.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      text: getComputedStyle(element).color,
    }));
  const defaultState = await read();
  await button.hover();
  const hover = await read();
  await page.mouse.down();
  const active = await read();
  await page.mouse.up();
  await page.mouse.move(0, 0);
  return [defaultState, hover, active];
}

async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectCoreCopyLegible(page, selector) {
  const samples = await page.locator(selector).evaluateAll((elements) => {
    const parse = (value) => {
      const channels = value.match(/[\d.]+/g)?.map(Number) ?? [];
      const rgb = channels.slice(0, 3);
      return value.startsWith("color(srgb")
        ? rgb.map((channel) => channel * 255)
        : rgb;
    };
    const luminance = ([red, green, blue]) => {
      const linear = [red, green, blue].map((channel) => {
        const value = channel / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const backgroundOf = (element) => {
      let current = element;
      while (current) {
        const color = getComputedStyle(current).backgroundColor;
        if (color !== "rgba(0, 0, 0, 0)") return parse(color);
        current = current.parentElement;
      }
      return [255, 255, 255];
    };
    return elements
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const foreground = luminance(parse(getComputedStyle(element).color));
        const background = luminance(backgroundOf(element));
        return {
          text: element.textContent.trim().slice(0, 80),
          ratio:
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05),
        };
      });
  });
  expect(samples.length).toBeGreaterThan(0);
  expect(samples.filter(({ ratio }) => ratio < 3)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("contextual review compares bounded warnings as interactive buttons", async ({
  page,
}) => {
  await page.goto("/contextual-review.html");
  await expect(
    page.getByRole("heading", { name: /두 결과를.*실제 버튼/u }),
  ).toBeVisible();
  await expect(page.locator("#case-picker button")).toHaveCount(22);
  await expect(page.locator(".mode-comparison")).toHaveCount(2);
  await expect(page.locator(".arm-card")).toHaveCount(4);
  await expect(page.locator(".live-action")).toHaveCount(8);
  await expect(page.locator(".mode-comparison:visible")).toHaveCount(1);
  await expect(page.locator(".mode-comparison.dark")).toBeVisible();

  const candidateDarkPrimary = page
    .locator(".mode-comparison.dark .arm-card.candidate .live-action.primary")
    .first();
  const defaultColor = await candidateDarkPrimary.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await candidateDarkPrimary.hover();
  await page.waitForTimeout(150);
  const hoverColor = await candidateDarkPrimary.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(hoverColor).not.toBe(defaultColor);

  await page
    .getByRole("tab", { name: /Dark Primary source fidelity/u })
    .click();
  await expect(page.locator("#case-picker button")).toHaveCount(9);
  await expect(page.locator("#case-title")).toContainText("#00CCFF");
  await expect(page.locator(".mode-comparison")).toHaveCount(1);
  await expect(page.locator(".light-omission")).toBeVisible();
  await expect(
    page.locator(".mode-comparison.dark .arm-card.candidate .metric.warn"),
  ).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
});

test("@smoke Warning review isolates Light appearance arms as live families", async ({
  page,
}) => {
  await page.goto("/warning-review.html");
  await expect(
    page.getByRole("heading", { name: /탁한 이유를.*분리해 보기/ }),
  ).toBeVisible();
  await expect(page.locator("#warning-input-tabs button")).toHaveCount(6);
  await expect(page.locator(".warning-arm")).toHaveCount(5);
  await expect(page.locator('[data-arm="current"]')).toContainText("#B48700");
  await expect(page.locator('[data-arm="prior-best"]')).toContainText(
    "#C79600",
  );
  await expect(page.locator('[data-arm="orangeward"]')).toContainText(
    "#FBA100",
  );
  await expect(page.locator('[data-arm="yellowward"]')).toContainText(
    "#D0B800",
  );
  const combined = page.locator('[data-arm="higher-lightness"] button');
  const defaultColor = await combined.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await combined.hover();
  const hoverColor = await combined.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(hoverColor).not.toBe(defaultColor);

  await page.getByRole("tab", { name: /#FF0000/ }).click();
  await expect(page.locator("#warning-input-title")).toContainText("#FF0000");
  await expectNoHorizontalOverflow(page);
});

test("@smoke About and Reference form one readable explanation path", async ({
  page,
}) => {
  await page.goto("/about.html");
  await expect(
    page.getByRole("heading", { name: /#FF0000.*생성 과정/ }),
  ).toBeVisible();
  await expect(page.locator("#red-walkthrough")).toBeVisible();
  await expect(page.locator("#primary-selection-example")).toBeVisible();
  await expect(page.locator("#primary-selection-example li")).toHaveCount(4);
  await page
    .getByRole("link", { name: "여러 후보 중 하나를 고르는 절차" })
    .click();
  await expect(page).toHaveURL(/#primary-selection-example$/);
  await expect(
    page.getByRole("heading", { name: /왜 Light 버튼은.*#B54437/ }),
  ).toBeVisible();
  await expect(page.locator("#numeric-lab")).toBeVisible();
  await expect(
    page.getByText("Selection과 Text는 언제 검사하는가?", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".foundation-scenes article")).toHaveCount(2);
  await expect(page.locator("#dependencies .svg-dag-node")).toHaveCount(11);
  await expect(page.locator("#dependencies [data-edge]")).toHaveCount(13);
  await expect(page.locator("#dependencies .pair-merge article")).toHaveCount(
    3,
  );
  await expect(
    page.locator('#dependencies [data-edge="destructive-warning"]'),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", {
      name: "어떤 색이 먼저 정해져야 다음 색을 고를 수 있는가?",
    }),
  ).toBeVisible();
  await expect(page.locator('.flow-list a[href^="#walkthrough-"]')).toHaveCount(
    8,
  );
  await expect(
    page.getByRole("heading", {
      name: "버튼색보다 먼저, 버튼이 놓일 화면 바탕을 만든다",
    }),
  ).toBeVisible();
  await expectCoreCopyLegible(
    page,
    ".about-heading :is(h1, h2, p), .walkthrough-copy p",
  );
  await expectNoHorizontalOverflow(page);

  await page
    .locator('a[href="./reference.html#input-classification"]')
    .first()
    .click();
  await expect(page).toHaveURL(/reference\.html#input-classification$/);
  await expect(page.locator("#input-classification")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "APCA와 Lc", exact: true }),
  ).toBeVisible();
  await expectCoreCopyLegible(
    page,
    ".reference-entry > :is(h2, .entry-question, .authority)",
  );
  await expectNoHorizontalOverflow(page);
});

test("@smoke About and Reference remain readable on a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/about.html",
    "/reference.html#apca-lc",
    "/reference.html#oklab-delta-e",
  ]) {
    await page.goto(path);
    await expect(page.locator(".product-nav")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  await expect(page.locator("#apca-lc")).toBeVisible();
  await expect(page.locator(".apca-overview")).toBeVisible();
  await expect(page.locator("#oklab-delta-e")).toBeVisible();
  await expect(page.locator(".delta-e-example")).toBeVisible();
  await page.goto("/warning-review.html");
  await expect(page.locator(".warning-comparison")).toBeVisible();
  await expectNoHorizontalOverflow(page);
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
  await expect(page.locator(".example.light .reference-shell")).toBeVisible();
  await expect(page.locator(".example.dark")).toHaveCount(0);
  await expect(
    page.locator(".example-section + .palette-section"),
  ).toBeVisible();
  const cssColorBoundary = await page.evaluate(async () => {
    const { generatePaletteV2, serializeModeCss } =
      await import("/v2/lib/palette.js");
    const result = generatePaletteV2({ primary: "#7A4ED8" });
    const generatedCss = serializeModeCss(result.modes.light);
    const style = document.createElement("style");
    style.textContent = `${generatedCss}\n[data-oklch-proof] { background: var(--palette-primary); }`;
    document.head.append(style);
    const proof = document.createElement("i");
    proof.dataset.oklchProof = "";
    proof.dataset.theme = "light";
    document.body.append(proof);
    const rendered = getComputedStyle(proof).backgroundColor;
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 1;
    const context = canvas.getContext("2d", { colorSpace: "srgb" });
    let maximumChannelDelta = 0;
    for (const mode of ["light", "dark"]) {
      for (const hex of Object.values(result.modes[mode].values)) {
        const coordinates =
          result.modes[mode].decisions[
            result.modes[mode].tokens.find(([color]) => color === hex)?.[1]
          ]?.selected?.oklch;
        if (!coordinates) continue;
        const css = `oklch(${coordinates.l.toFixed(8)} ${coordinates.c.toFixed(8)} ${coordinates.h.toFixed(6)})`;
        context.clearRect(0, 0, 2, 1);
        context.fillStyle = hex;
        context.fillRect(0, 0, 1, 1);
        context.fillStyle = css;
        context.fillRect(1, 0, 1, 1);
        const pixels = context.getImageData(0, 0, 2, 1, {
          colorSpace: "srgb",
        }).data;
        for (let channel = 0; channel < 3; channel += 1) {
          maximumChannelDelta = Math.max(
            maximumChannelDelta,
            Math.abs(pixels[channel] - pixels[channel + 4]),
          );
        }
      }
    }
    proof.remove();
    style.remove();
    return {
      supported: CSS.supports("color", "oklch(0.6 0.15 30)"),
      generatedCss,
      rendered,
      maximumChannelDelta,
    };
  });
  expect(cssColorBoundary.supported).toBe(true);
  expect(cssColorBoundary.generatedCss).toMatch(
    /--palette-primary: #[0-9A-F]{6};[\s\S]+@supports \(color: oklch\(0\.5 0 0\)\)[\s\S]+--palette-primary: oklch\(/,
  );
  expect(cssColorBoundary.rendered).toMatch(/^(?:oklch|rgb|color\(srgb)/);
  expect(cssColorBoundary.maximumChannelDelta).toBeLessThanOrEqual(1);
});

test("@smoke applied samples switch between complete component situations", async ({
  page,
}) => {
  await page.goto("/");
  const tabs = page.getByRole("tablist", { name: "Sample situation" });
  await expect(tabs.getByRole("tab")).toHaveCount(5);
  await expect(tabs.getByRole("tab", { name: "Workspace" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#examples")).toContainText("# design-review");

  await tabs.getByRole("tab", { name: "Routine actions" }).click();
  await expect(page.locator("#examples")).toHaveAttribute(
    "aria-labelledby",
    "sample-tab-routine-actions",
  );
  await expect(page.locator("#examples")).toContainText("Save changes");
  await expect(page.locator("#examples")).toContainText("Delete project");
  await expect(
    page.locator("#examples [data-action-presentation]").first(),
  ).toHaveAttribute(
    "data-action-presentation",
    "primary-filled-destructive-outline",
  );

  await tabs.getByRole("tab", { name: "Destructive confirmation" }).click();
  const confirmation = page.locator("#examples .reference-feedback").first();
  await expect(confirmation).toHaveAttribute(
    "data-action-presentation",
    "destructive-filled-secondary-cancel",
  );
  await expect(
    confirmation.getByRole("button", { name: "Cancel" }),
  ).toBeVisible();
  await expect(
    confirmation.getByRole("button", { name: "Move to Trash" }),
  ).toBeVisible();

  await tabs.getByRole("tab", { name: "Feedback & selection" }).click();
  await expect(page.locator("#examples .reference-warning")).toBeVisible();
  await expect(page.locator("#examples .selected-message")).toBeVisible();
  const warning = page
    .locator("#examples .example.light")
    .getByRole("button", { name: "Review warning" });
  const warningDefault = await warning.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await warning.hover();
  const warningHover = await warning.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await expect(
    warning.locator("xpath=.././/b[contains(@class, 'hover')]"),
  ).toBeVisible();
  await page.mouse.down();
  const warningActive = await warning.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await expect(
    warning.locator("xpath=.././/b[contains(@class, 'active')]"),
  ).toBeVisible();
  await expect(
    warning.locator("xpath=.././/b[contains(@class, 'hover')]"),
  ).toBeHidden();
  await page.mouse.up();
  expect(warningHover).not.toBe(warningDefault);
  expect(warningActive).not.toBe(warningHover);

  const formTab = tabs.getByRole("tab", { name: "Form & focus" });
  await formTab.click();
  await expect(page.getByLabel("Review title")).toBeVisible();
  const formPrimary = page
    .locator("#examples .example.light")
    .getByRole("button", { name: "Create request" });
  const formDefault = await formPrimary.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await formPrimary.hover();
  const formHover = await formPrimary.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await page.mouse.down();
  const formActive = await formPrimary.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  await page.mouse.up();
  expect(formHover).not.toBe(formDefault);
  expect(formActive).not.toBe(formHover);
  await expect(page.getByLabel("Assigned reviewer").first()).toBeDisabled();
  await expect(
    page.locator("#examples .reference-popover").first(),
  ).toBeVisible();
  await formTab.press("Home");
  await expect(tabs.getByRole("tab", { name: "Workspace" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("confirmation actions share the mode direction while Secondary labels retain contrast", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Compare" }).click();
  await page.getByRole("tab", { name: "Destructive confirmation" }).click();

  for (const mode of ["light", "dark"]) {
    const confirmation = page.locator(
      `#examples .example.${mode} .reference-feedback`,
    );
    await expect(confirmation).toHaveAttribute(
      "data-secondary-state-policy",
      "confirmation-secondary-state-family-v1",
    );
    const cancelStates = await interactiveButtonColors(
      page,
      confirmation.getByRole("button", { name: "Cancel" }),
    );
    await expect(
      confirmation.getByRole("button", { name: "Cancel" }),
    ).toHaveCSS("font-size", "11px");
    await expect(
      confirmation.getByRole("button", { name: "Cancel" }),
    ).toHaveCSS("font-weight", "650");
    const destructiveStates = await interactiveButtonColors(
      page,
      confirmation.getByRole("button", { name: "Move to Trash" }),
    );
    const direction = mode === "light" ? -1 : 1;

    for (const states of [cancelStates, destructiveStates]) {
      const lightness = states.map(
        ({ background }) =>
          rgbToOklch(hexToRgb(renderedColorToHex(background))).l,
      );
      expect(direction * (lightness[1] - lightness[0])).toBeGreaterThan(0);
      expect(direction * (lightness[2] - lightness[1])).toBeGreaterThan(0);
    }
    for (const { background, text } of cancelStates) {
      expect(
        contrastRatio(renderedColorToHex(text), renderedColorToHex(background)),
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
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
  await page.getByRole("tab", { name: "Routine actions" }).click();
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
  await page.getByRole("tab", { name: "Destructive confirmation" }).click();
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
  await expect(page.locator(".pair-decision")).toContainText(
    "prefer candidates passing every policy-owned Primary pair eligibility check when available",
  );
  await expect(page.locator(".pair-decision")).toContainText(
    "sampled pairs compared",
  );
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
