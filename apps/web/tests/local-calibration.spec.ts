import { expect, test } from "@playwright/test"

const localUrl = process.env.CRITERIAFORGE_LOCAL_URL

test.skip(
  !localUrl || process.env.CRITERIAFORGE_LIVE_CALIBRATION !== "1",
  "Enable only for an explicit three-run live Codex calibration."
)

test("ratified live draft calibrates three times and compiles immutably", async ({
  page,
}) => {
  test.setTimeout(25 * 60 * 1_000)
  page.setDefaultTimeout(20_000)
  await page.goto(localUrl!)

  await page
    .getByRole("button", { name: "Review constitution draft" })
    .click()
  await expect(page.getByText("Live local draft r1")).toBeVisible()

  const approveAll = page.getByRole("button", {
    name: "Approve all displayed rules and examples",
  })
  if (await approveAll.isVisible()) {
    await approveAll.click()
    await expect(approveAll).toBeHidden()
  }

  const answer = page.getByPlaceholder(
    "Record the Constitution Owner’s decision in the source language…"
  )
  for (const decision of [
    "A material assumption changes the promised audience, scope, must-pass behavior, privacy boundary, or irreversible product action. The product must ask one explicit question and record the owner’s answer before implementation.",
    "Evaluating people includes scoring, ranking, recommending, filtering, or deciding eligibility about an identifiable person. All such behavior is outside scope.",
  ]) {
    await expect(answer).toBeVisible()
    await answer.fill(decision)
    await page
      .getByRole("button", { name: "Record human decision" })
      .click()
  }
  await expect(
    page.getByText("All displayed decisions ratified")
  ).toBeVisible()

  await page.keyboard.press("Meta+3")
  await expect(
    page.getByRole("button", { name: "Run three calibration checks" })
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Run three calibration checks" })
    .click()

  const calibration = page.getByRole("alertdialog")
  await expect(
    calibration.getByRole("heading", {
      name: "Approve three independent calibration runs",
    })
  ).toBeVisible()
  await calibration
    .getByRole("button", { name: "Approve calibration" })
    .click()

  await expect(
    page.getByRole("button", { name: "Compile immutable v1.0" })
  ).toBeVisible({ timeout: 22 * 60 * 1_000 })
  await expect(page.getByText("5 / 5 pass")).toBeVisible()
  await page.getByRole("button", { name: "Compile immutable v1.0" }).click()

  const compile = page.getByRole("alertdialog")
  await expect(
    compile.getByRole("heading", {
      name: "Compile Product Constitution v1.0?",
    })
  ).toBeVisible()
  await compile
    .getByRole("button", { name: "Compile immutable version" })
    .click()
  await expect(
    page.getByText("Product Constitution v1.0 compiled.")
  ).toBeVisible()
})
