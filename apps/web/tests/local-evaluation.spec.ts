import { expect, test } from "@playwright/test"

const localUrl = process.env.CRITERIAFORGE_LOCAL_URL
const targetRepository = process.env.CRITERIAFORGE_TARGET_REPO

test.skip(
  !localUrl ||
    !targetRepository ||
    process.env.CRITERIAFORGE_LIVE_EVALUATION !== "1",
  "Enable only for an explicit three-run live artifact evaluation."
)

test("fixed Git target is evaluated three times against the immutable version", async ({
  page,
}) => {
  test.setTimeout(30 * 60 * 1_000)
  page.setDefaultTimeout(20_000)
  await page.goto(localUrl!)
  await expect(
    page.getByText("Local browser acceptance").first()
  ).toBeVisible()
  await expect(
    page.getByText("founder-intent.md", { exact: true })
  ).toBeVisible()
  await page.keyboard.press("Meta+4")

  const fixedTarget = page.getByText("Fixed target snapshot")
  if (!(await fixedTarget.isVisible())) {
    await page
      .getByLabel("Absolute local repository path")
      .fill(targetRepository!)
    await page.getByRole("button", { name: "Freeze Git snapshot" }).click()
  }
  await expect(page.getByText("Fixed target snapshot")).toBeVisible({
    timeout: 120_000,
  })

  await page
    .getByRole("button", { name: "Review evaluation send" })
    .click()
  const review = page.getByRole("alertdialog")
  await expect(
    review.getByRole("heading", {
      name: "Review the evidence for three formal runs",
    })
  ).toBeVisible()
  await expect(
    review.getByText(/One approval covers the same input/)
  ).toBeVisible()
  await review.getByRole("button", { name: "Approve this send" }).click()

  await expect(
    page.getByText(/3 runs agree|Stability insufficient/)
  ).toBeVisible({ timeout: 28 * 60 * 1_000 })
  await expect(page.getByText("Intent", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("Observed", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("Evidence", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("Gap", { exact: true }).first()).toBeVisible()
})
