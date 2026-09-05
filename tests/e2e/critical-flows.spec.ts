import { expect, test, type Page } from "@playwright/test";

const password = process.env.SEED_DEFAULT_PASSWORD;
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("نام کاربری").fill(username);
  await page.getByLabel("رمز عبور").fill(password!);
  await page.getByRole("button", { name: "ورود به سامانه" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("critical invoice workflows", () => {
  test.skip(
    !password,
    "SEED_DEFAULT_PASSWORD is required for seeded E2E accounts",
  );

  test("user signs in and reaches the protected request form", async ({
    page,
  }) => {
    await login(page, process.env.E2E_USER_USERNAME || "davood");
    await page.goto("/invoices/new?category=lunch");
    await expect(
      page.getByRole("heading", { name: "ثبت فاکتور جدید" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "خرید تخصصی" })).toBeVisible();
  });

  test("employee creates a documented request and lunch admin approves and pays it", async ({
    page,
  }) => {
    await login(page, process.env.E2E_USER_USERNAME || "davood");
    const bankUpdateStatus = await page.evaluate(
      async () =>
        (
          await fetch("/api/v1/me/bank-account", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cardNumber: "6037997513657099",
              iban: "IR062960000000100324200001",
            }),
          })
        ).status,
    );
    expect(bankUpdateStatus).toBe(200);
    await page.goto("/invoices/new?category=lunch");
    await page.locator('input[type="checkbox"]').first().check();
    await page
      .getByLabel("مبلغ فاکتور (تومان)")
      .fill(String(2_000_000 + (Date.now() % 500_000)));
    await page.locator('input[name="invoice"]').setInputFiles({
      name: "invoice.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });
    await page.locator('input[name="paymentProof"]').setInputFiles({
      name: "receipt.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });
    await page.getByRole("button", { name: "ثبت فاکتور" }).click();
    const duplicateWarning = page.getByText("فاکتور مشابه پیدا شد");
    await Promise.race([
      page.waitForURL(/\/invoices\/[0-9a-f-]+$/i, { timeout: 5_000 }),
      duplicateWarning.waitFor({ state: "visible", timeout: 5_000 }),
    ]);
    if (await duplicateWarning.isVisible())
      await page
        .getByRole("button", { name: "ثبت به‌عنوان فاکتور جداگانه" })
        .click();
    await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]+$/i, {
      timeout: 20_000,
    });
    const requestUrl = page.url();
    const requestId = requestUrl.split("/").pop()!;

    await page.getByRole("button", { name: "خروج" }).last().click();
    await login(page, process.env.E2E_SECOND_USER_USERNAME || "mozhgan");
    const crossUserStatus = await page.evaluate(
      async (id) => (await fetch(`/api/v1/invoice-requests/${id}`)).status,
      requestId,
    );
    expect(crossUserStatus).toBe(404);

    await page.getByRole("button", { name: "خروج" }).last().click();
    await login(
      page,
      process.env.SEED_FINANCE_ADMIN_USERNAME || "financeadmin",
    );
    await page.goto(requestUrl);
    await page.getByRole("button", { name: "تأیید درخواست" }).click();
    await page.getByRole("button", { name: "تأیید نهایی" }).click();
    await expect(
      page.getByText("تأییدشده، منتظر پرداخت").first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "ثبت پرداخت" }).click();
    await page.getByLabel("شماره پیگیری").fill(`E2E-${Date.now()}`);
    await page
      .getByRole("button", { name: "ثبت پرداخت و قفل درخواست" })
      .click();
    await expect(page.getByText("پرداخت‌شده").first()).toBeVisible();
    await expect(
      page.getByText("این سابقه مالی پرداخت و قفل شده است."),
    ).toBeVisible();
  });

  test("employee submits a specialist purchase and finance approves it", async ({
    page,
  }) => {
    await login(page, process.env.E2E_SECOND_USER_USERNAME || "mozhgan");
    await page.goto("/invoices/new?category=lab");
    await page.getByLabel("چه چیزی خریدید؟").fill("ماژول توسعه E2E");
    await page.getByLabel("دسته خرید").selectOption("MODULE");
    await page
      .getByLabel("مبلغ فاکتور (تومان)")
      .fill(String(8_000_000 + (Date.now() % 500_000)));
    await page.locator('input[name="invoice"]').setInputFiles({
      name: "module-invoice.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });
    await page.locator('input[name="paymentProof"]').setInputFiles({
      name: "module-receipt.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });
    await page.getByRole("button", { name: "ثبت فاکتور" }).click();
    await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]+$/i, {
      timeout: 20_000,
    });
    const requestUrl = page.url();
    await page.getByRole("button", { name: "خروج" }).last().click();
    await login(
      page,
      process.env.SEED_FINANCE_ADMIN_USERNAME || "financeadmin",
    );
    await page.goto(requestUrl);
    await page.getByRole("button", { name: "تأیید درخواست" }).click();
    await page.getByRole("button", { name: "تأیید نهایی" }).click();
    await expect(
      page.getByText("تأییدشده، منتظر پرداخت").first(),
    ).toBeVisible();
  });

  test("ordinary user cannot open administrator routes", async ({ page }) => {
    await login(page, process.env.E2E_USER_USERNAME || "davood");
    await page.goto("/admin/settings");
    await expect(
      page.getByText(/اجازه انجام این عملیات را ندارید|مشکلی پیش آمد/),
    ).toBeVisible();
  });

  test("finance admin can open the review queue", async ({ page }) => {
    await login(
      page,
      process.env.SEED_FINANCE_ADMIN_USERNAME || "financeadmin",
    );
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "مدیریت فاکتورها" }),
    ).toBeVisible();
  });
});
