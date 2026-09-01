import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const plusDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return iso(date);
};

const invoice = {
  code: "INVOICE_COLLECTIONS",
  title: "Invoice collections",
  description: "Billed, collected and outstanding amounts.",
  category: "Finance",
  supportsDateRange: true,
  dateMode: "HISTORICAL",
  availableToRoles: ["Landlord"],
};
const lease = {
  code: "LEASE_EXPIRY",
  title: "Lease expiry",
  description: "Leases approaching expiry.",
  category: "Rentals",
  supportsDateRange: true,
  dateMode: "FORWARD",
  availableToRoles: ["Landlord"],
};

test("reports stay bounded, require deliberate filters, and support forward lease dates", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: [] });
  const today = iso(new Date());
  const requests: { code: string; from: string | null; to: string | null }[] = [];

  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([invoice, lease]) }));
  await page.route(/\/reports\/(INVOICE_COLLECTIONS|LEASE_EXPIRY)(\?.*)?$/, route => {
    const url = new URL(route.request().url());
    const code = url.pathname.split("/").at(-1)!;
    requests.push({ code, from: url.searchParams.get("from"), to: url.searchParams.get("to") });
    const definition = code === "LEASE_EXPIRY" ? lease : invoice;
    return route.fulfill({ json: envelope({
      definition,
      from: url.searchParams.get("from") ?? today,
      to: url.searchParams.get("to") ?? today,
      generatedAt: "2026-09-01T09:00:00+03:00",
      metrics: { Records: 500 },
      columns: ["Reference", "Status"],
      rows: [{ Reference: "INV-100", Status: "OVERDUE" }],
      truncated: code === "INVOICE_COLLECTIONS",
      rowLimit: 500,
    }) });
  });
  await page.route("**/reports/INVOICE_COLLECTIONS/export**", route => route.fulfill({
    body: "Reference,Status\r\nINV-100,OVERDUE\r\n",
    contentType: "text/csv",
    headers: { "X-Report-Truncated": "true", "X-Report-Row-Limit": "5000" },
  }));

  await page.goto("/dashboard/reports");
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByText("Showing the first 500 rows.")).toBeVisible();
  await expect(page.getByText("INV-100")).toBeVisible();

  await page.getByLabel("From").fill(plusDays(today, -7));
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  const beforeGenerate = requests.length;
  await page.getByRole("button", { name: "Generate" }).click();
  await expect.poll(() => requests.length).toBe(beforeGenerate + 1);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  await download;
  await expect(page.getByText("The export reached its 5,000-row safety limit.")).toBeVisible();

  await page.getByLabel("Report").selectOption("LEASE_EXPIRY");
  await expect(page.getByText("Forward looking")).toBeVisible();
  await expect(page.getByLabel("From")).toHaveValue(today);
  await expect(page.getByLabel("To")).toHaveValue(plusDays(today, 90));
  await expect.poll(() => requests.at(-1)).toMatchObject({ code: "LEASE_EXPIRY", from: today, to: plusDays(today, 90) });
});
