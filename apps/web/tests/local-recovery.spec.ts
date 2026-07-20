import { expect, test } from "@playwright/test"

const localUrl = process.env.CRITERIAFORGE_LOCAL_URL

test.skip(
  !localUrl || process.env.CRITERIAFORGE_RECOVERY_TEST !== "1",
  "Set a restarted CRITERIAFORGE_LOCAL_URL and enable the recovery check."
)

test("local state survives a complete application restart", async ({ page }) => {
  page.setDefaultTimeout(15_000)
  await page.goto(localUrl!)
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText("Local browser acceptance").first()).toBeVisible()
  await expect(
    page.getByText("founder-intent.md", { exact: true })
  ).toBeVisible()

  await page
    .getByRole("button", { name: "Review constitution draft" })
    .click()
  await expect(page.getByText("Live local draft r1")).toBeVisible()
  await expect(page.getByText(/decisions remain/)).toBeVisible()
})
