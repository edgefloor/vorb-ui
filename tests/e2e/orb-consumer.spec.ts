import { expect, test, type Page } from "@playwright/test";

const THEMES = ["debug", "circle", "bars", "cloud", "radial"] as const;
const STATES = ["idle", "connecting", "listening", "thinking", "speaking", "error"] as const;

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("loads the built package and every theme/state combination", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "vorb-ui built consumer" })).toBeVisible();
  await expect(page.getByTestId("adapter-exports")).toHaveText("ready");

  for (const theme of THEMES) {
    for (const state of STATES) {
      const fixture = page.getByTestId(`matrix-${theme}-${state}`);
      await expect(fixture).toBeVisible();
      await expect(fixture.locator(`[data-theme="${theme}"][data-state="${state}"]`)).toBeVisible();
      await expect(fixture.getByRole("button")).toHaveCount(0);
    }
  }

  expect(browserErrors).toEqual([]);
});

test("runs adapter start and stop through the shared control", async ({ page }) => {
  const browserErrors = collectBrowserErrors(page);
  await page.goto("/");

  await expect(page.getByTestId("adapter-state")).toHaveText("idle");
  await page.getByRole("button", { name: "Start voice session" }).click();
  await expect(page.getByTestId("adapter-state")).toHaveText("listening");
  await expect(page.getByTestId("adapter-input-volume")).toHaveText("0.42");
  await page.getByRole("button", { name: "Stop voice session" }).click();
  await expect(page.getByTestId("adapter-state")).toHaveText("idle");

  expect(browserErrors).toEqual([]);
});

test("supports passive visuals with external controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("external-cloud-orb").getByRole("button")).toHaveCount(0);
  await page.getByRole("button", { name: "Start externally" }).click();
  await expect(page.getByTestId("adapter-state")).toHaveText("listening");
  await page.getByRole("button", { name: "Stop externally" }).click();
  await expect(page.getByTestId("adapter-state")).toHaveText("idle");
});

test("has no horizontal overflow at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
