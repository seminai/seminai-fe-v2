import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { TEST_DATA } from "./test-data";

export const AUTH_STATE_PATH = path.resolve(
  process.cwd(),
  "playwright/.auth/user.json",
);

function ensureAuthStateDir(): void {
  fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
}

export async function loginViaUi(page: Page): Promise<void> {
  const { email, password } = TEST_DATA.credentials;
  if (!email || !password) {
    throw new Error(
      "Missing credentials: set E2E_EMAIL and E2E_PASSWORD in environment.",
    );
  }

  await page.goto("/auth");
  await page.getByPlaceholder("nome@esempio.com").fill(email);
  await page.getByPlaceholder("password").fill(password);
  await page.getByRole("button", { name: /Accedi/ }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function saveAuthenticatedState(page: Page): Promise<void> {
  ensureAuthStateDir();
  await page.context().storageState({ path: AUTH_STATE_PATH });
}
