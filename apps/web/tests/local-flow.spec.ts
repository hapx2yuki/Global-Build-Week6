import { expect, test } from "@playwright/test"

const localUrl = process.env.CRITERIAFORGE_LOCAL_URL

test.skip(!localUrl, "Set CRITERIAFORGE_LOCAL_URL to a one-time local URL.")

test("local intake reaches a segment-level Codex send confirmation", async ({
  page,
}) => {
  test.setTimeout(
    process.env.CRITERIAFORGE_LIVE_CODEX === "1" ? 20 * 60 * 1_000 : 30_000
  )
  page.setDefaultTimeout(10_000)
  await page.goto(localUrl!)
  await expect(page).toHaveURL(/\/$/)

  await page.getByLabel("Case name").fill("Local browser acceptance")
  await page.getByLabel("Original language").fill("en")
  await page.getByRole("button", { name: "Create workspace" }).click()
  await expect(page.getByText("Local browser acceptance").first()).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles({
    name: "founder-intent.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(
      [
        "# Founder intent",
        "The product helps an owner preserve explicit product intent.",
        "It must ask before making a material assumption.",
        "It must never evaluate people.",
      ].join("\n")
    ),
  })
  await expect(
    page.getByText("founder-intent.md", { exact: true })
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Review constitution draft" })
    .click()
  const dialog = page.getByRole("alertdialog")
  await expect(
    dialog.getByRole("heading", {
      name: "Review exactly what leaves this Mac",
    })
  ).toBeVisible()
  await expect(dialog.getByText("founder-intent.md")).toBeVisible()
  await expect(dialog.getByText(/Fresh approval applies to this run only/)).toBeVisible()
  await expect(
    dialog.getByRole("button", { name: "Approve this send" })
  ).toBeEnabled()

  if (process.env.CRITERIAFORGE_LIVE_CODEX === "1") {
    await dialog.getByRole("button", { name: "Approve this send" }).click()
    await expect(page.getByText("Live local draft r1")).toBeVisible({
      timeout: 18 * 60 * 1_000,
    })
    await expect(
      page.getByText(/decisions remain|All displayed decisions ratified/)
    ).toBeVisible()
  }
})
