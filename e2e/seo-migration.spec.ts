import { test, expect } from "@playwright/test";
test("English home is complete without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${process.env.SEO_STATIC_BASE ?? 'http://127.0.0.1:8765'}/en/`);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toContainText("We turn");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://seminai.tech/en/",
  );
  await expect(
    page.getByRole("link", { name: "Resources", exact: true }).first(),
  ).toBeVisible();
  await context.close();
});
test("an Italian app preference cannot change an English public URL", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("seminai-language", "it"),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/en/agricultural-document-ocr/");
  await expect(page.locator("h1")).toHaveText(
    "OCR for agricultural invoices and delivery notes",
  );
  await page.waitForTimeout(800);
  expect(errors).toEqual([]);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
for (const outcome of ["success", "error"] as const)
  test(`demo ${outcome} uses a mocked email endpoint`, async ({ page }) => {
    let submissions = 0;
    await page.route("**/email/send-email", async (route) => {
      submissions++;
      await route.fulfill({
        status: outcome === "success" ? 202 : 503,
        contentType: "application/json",
        body: JSON.stringify(
          outcome === "success" ? { status: "success" } : { status: "error" },
        ),
      });
    });
    await page.addInitScript(() => {
      localStorage.setItem(
        "seminai-cookie-consent",
        JSON.stringify({ status: "denied", version: 1 }),
      );
    });
    await page.goto("/en/request-a-demo/");
    await page.getByLabel(/^Full name/).fill("Synthetic Reviewer");
    await page
      .getByRole("textbox", { name: /^Email/ })
      .fill("review@example.invalid");
    await page.getByLabel(/^Sector/).selectOption({ index: 1 });
    await page
      .getByLabel("Invoices and delivery notes", { exact: true })
      .check();
    const date = new Date();
    date.setDate(date.getDate() + 2);
    while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1);
    await page
      .getByLabel(/^Preferred day/)
      .fill(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      );
    await page.getByLabel(/^Preferred time/).selectOption({ index: 1 });
    await page
      .getByRole("button", { name: "Request a demo", exact: true })
      .click();
    await expect(
      page.getByText(
        outcome === "success" ? "Request sent." : "Sending failed.",
        { exact: false },
      ),
    ).toBeVisible();
    expect(submissions).toBe(1);
    const events = await page.evaluate(() =>
      (
        (window as typeof window & { dataLayer?: IArguments[] }).dataLayer ?? []
      ).map((value) => Array.from(value)[1]),
    );
    expect(events).not.toContain("demo_request_success");
  });
test("consented analytics records success only after the mocked endpoint accepts the request", async ({
  page,
}) => {
  await page.route("**/googletagmanager.com/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  await page.route("**/google-analytics.com/**", (route) => route.abort());
  await page.addInitScript(() =>
    localStorage.setItem(
      "seminai-cookie-consent",
      JSON.stringify({ status: "granted", version: 1 }),
    ),
  );
  let release: (() => void) | undefined;
  await page.route("**/email/send-email", async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ status: "success" }),
    });
  });
  await page.goto("/en/request-a-demo/");
  await page.getByLabel(/^Full name/).fill("Synthetic Reviewer");
  await page
    .getByRole("textbox", { name: /^Email/ })
    .fill("review@example.invalid");
  await page.getByLabel(/^Sector/).selectOption({ index: 1 });
  await page.getByLabel("Invoices and delivery notes", { exact: true }).check();
  const date = new Date();
  date.setDate(date.getDate() + 2);
  while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1);
  await page
    .getByLabel(/^Preferred day/)
    .fill(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    );
  await page.getByLabel(/^Preferred time/).selectOption({ index: 1 });
  await page
    .getByRole("button", { name: "Request a demo", exact: true })
    .click();
  await expect.poll(() => typeof release).toBe("function");
  const events = () =>
    page.evaluate(() =>
      ((window as typeof window & { dataLayer?: IArguments[] }).dataLayer ?? [])
        .filter((value) => value[0] === "event")
        .map((value) => value[1]),
    );
  expect(await events()).not.toContain("demo_request_success");
  release?.();
  await expect(page.getByText("Request sent.", { exact: true })).toBeVisible();
  expect(
    (await events()).filter((event) => event === "demo_request_success"),
  ).toHaveLength(1);
});
