import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("recorded FounderBrief flow preserves authority and comparison boundaries", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  page.on("pageerror", (error) => consoleErrors.push(error.message))

  await page.goto("/")
  await expect(
    page.getByText("Replay recorded GPT-5.6 evaluation")
  ).toBeVisible()
  await expect(
    page.getByRole("heading", {
      name: "Gather the sources that govern the product",
    })
  ).toBeVisible()
  await expect(page.getByText("founder-note.txt")).toBeVisible()

  await page.keyboard.press("Control+2")
  await expect(
    page.getByRole("heading", { name: "CriteriaForge", exact: true })
  ).toBeVisible()

  if (testInfo.project.name.startsWith("mobile")) {
    await page
      .getByRole("button", { name: "Open constitution question" })
      .click()
  }
  await page.getByRole("button", { name: "Approve recommendation" }).click()
  if (testInfo.project.name.startsWith("mobile")) {
    await page
      .getByRole("button", { name: "Open constitution question" })
      .click()
  }
  await expect(
    page.getByRole("button", { name: "Recommendation approved" }).filter({
      visible: true,
    })
  ).toBeVisible()
  if (testInfo.project.name.startsWith("mobile")) {
    await page.keyboard.press("Escape")
  }

  await page.keyboard.press("Control+3")
  await expect(
    page.getByRole("heading", {
      name: "Freeze only the meaning a human has ratified",
    })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Compile immutable v1.0" })
    .click()
  await expect(
    page.getByRole("alertdialog", {
      name: "Compile Product Constitution v1.0?",
    })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Compile immutable version" })
    .click()

  await expect(
    page.getByRole("heading", {
      name: "Move from a finding back to the exact source",
    })
  ).toBeVisible()
  await expect(page.getByText("SHA-256 c884…6a21")).toBeVisible()

  await page.keyboard.press("Control+5")
  await expect(
    page.getByRole("heading", { name: "Intent–reality gap" })
  ).toBeVisible()
  await expect(page.getByText("Formal evaluation · 3 independent runs")).toBeVisible()
  await page.getByRole("button", { name: "Create Codex brief" }).click()

  await expect(
    page.getByRole("heading", {
      name: "Give Codex the gap—not the authority to change the constitution",
    })
  ).toBeVisible()
  await page.getByRole("button", { name: "Replay recorded repair" }).click()
  await expect(page.getByText("Allowed diff and tests verified")).toBeVisible()
  await page
    .getByRole("button", { name: "Compare the same criteria" })
    .click()
  await expect(
    page.getByRole("heading", {
      name: "Compare before and after without weakening the constitution",
    })
  ).toBeVisible()
  await expect(page.getByText("Same contract hash")).toBeVisible()

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(
    accessibility.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? "")
    )
  ).toEqual([])
  expect(consoleErrors).toEqual([])
})

test("language switch and keyboard navigation stay usable", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Change language to 日本語" }).click()
  await expect(
    page.getByRole("heading", { name: "判断の原典を、端末内へ集める" })
  ).toBeVisible()
  await page.keyboard.press("Control+4")
  await expect(
    page.getByRole("heading", { name: "結論から、原典の位置まで戻れる" })
  ).toBeVisible()
  await page.keyboard.press("Control+1")
  await expect(
    page.getByRole("heading", { name: "判断の原典を、端末内へ集める" })
  ).toBeVisible()
})

test.describe("default interface language", () => {
  test.use({ locale: "ja-JP" })

  test("starts in English even when the browser language is Japanese", async ({
    page,
  }) => {
    await page.goto("/")

    await expect(
      page.getByRole("heading", {
        name: "Gather the sources that govern the product",
      })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Change language to 日本語" })
    ).toBeVisible()
  })
})
