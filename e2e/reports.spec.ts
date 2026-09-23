import { expect, test, Route } from "@playwright/test";
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
    return route.fulfill({ json: envelope([{
      definition,
      from: url.searchParams.get("from") ?? today,
      to: url.searchParams.get("to") ?? today,
      generatedAt: "2026-09-01T09:00:00+03:00",
      metrics: { Records: 500 },
      columns: ["Reference", "Status"],
      rows: [{ Reference: "INV-100", Status: "OVERDUE" }],
      truncated: code === "INVOICE_COLLECTIONS",
      rowLimit: 500,
    }]) });
  });
  await page.route("**/reports/INVOICE_COLLECTIONS/export**", route => route.fulfill({
    body: "Reference,Status\r\nINV-100,OVERDUE\r\n",
    contentType: "text/csv",
    headers: {
      "X-Report-Truncated": "true",
      "X-Report-Row-Limit": "5000",
      "Access-Control-Expose-Headers": "X-Report-Truncated, X-Report-Row-Limit",
    },
  }));

  await page.goto("/dashboard/reports");
  await expect(page.locator("main").getByRole("heading", { name: "Reports", exact: true })).toBeVisible();
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
  await expect(page.getByLabel("To", { exact: true })).toHaveValue(plusDays(today, 90));
  await expect.poll(() => requests.at(-1)).toMatchObject({ code: "LEASE_EXPIRY", from: today, to: plusDays(today, 90) });
});

const resultFor = (definition = invoice, reference = "INV-WIRED", url?: URL) => ({
  definition,
  from: url?.searchParams.get("from") ?? iso(new Date()),
  to: url?.searchParams.get("to") ?? iso(new Date()),
  generatedAt: new Date().toISOString(),
  metrics: { Records: 1 },
  columns: ["Reference", "Status"],
  rows: [{ Reference: reference, Status: "PAID" }],
  truncated: false,
  rowLimit: 500,
});

test("report API singleton-list responses render through the sidebar and retain legacy compatibility", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: [] });
  let legacy = false;
  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([invoice]) }));
  await page.route(/\/reports\/INVOICE_COLLECTIONS\?/, route => {
    const report = resultFor(invoice, legacy ? "INV-LEGACY" : "INV-SINGLETON", new URL(route.request().url()));
    return route.fulfill({ json: envelope(legacy ? report : [report]) });
  });
  await page.goto("/dashboard/notifications");
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/reports$/);
  await expect(page.getByText("INV-SINGLETON")).toBeVisible();
  legacy = true;
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(page.getByText("INV-LEGACY")).toBeVisible();
});

test("generation failure remains visible and retry restores export readiness", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: [] });
  let failing = true;
  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([invoice]) }));
  await page.route(/\/reports\/INVOICE_COLLECTIONS\?/, route => failing
    ? route.fulfill({ status: 503, json: { success: false, description: "Reports are temporarily unavailable. Please retry." } })
    : route.fulfill({ json: envelope([resultFor(invoice, "INV-RETRY", new URL(route.request().url()))]) }));
  await page.goto("/dashboard/reports");
  await expect(page.getByRole("alert").filter({ hasText: "Reports are temporarily unavailable." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  failing = false;
  await page.getByRole("button", { name: "Retry report" }).click();
  await expect(page.getByText("INV-RETRY")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeEnabled();
});

test("catalogue failure is retryable and malformed responses are not presented as no access", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: [] });
  let failing = true;
  await page.route("**/reports/catalog", route => route.fulfill({ json: failing
    ? { success: true, data: { incorrect: "not a catalogue" } } : envelope([invoice]) }));
  await page.route(/\/reports\/INVOICE_COLLECTIONS\?/, route => route.fulfill({ json: envelope([resultFor(invoice, "INV-CATALOG", new URL(route.request().url()))]) }));
  await page.goto("/dashboard/reports");
  const retry = page.getByRole("button", { name: "Try again", exact: true });
  await expect(retry.locator("..").getByText("The report catalogue could not be loaded.", { exact: true })).toBeVisible();
  await expect(page.getByText("No reports are currently available to the active role.")).toHaveCount(0);
  failing = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("INV-CATALOG")).toBeVisible();
});

test("changing filters invalidates an in-flight report instead of displaying stale totals", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: [] });
  let pending: Route | undefined;
  let hold = false;
  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([invoice]) }));
  await page.route(/\/reports\/INVOICE_COLLECTIONS\?/, route => {
    if (hold) { pending = route; return; }
    return route.fulfill({ json: envelope([resultFor(invoice, "INV-CURRENT", new URL(route.request().url()))]) });
  });
  await page.goto("/dashboard/reports");
  await expect(page.getByText("INV-CURRENT")).toBeVisible();
  hold = true;
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect.poll(() => Boolean(pending)).toBe(true);
  await page.getByLabel("From", { exact: true }).fill(plusDays(iso(new Date()), -3));
  await pending!.fulfill({ json: envelope([resultFor(invoice, "INV-STALE", new URL(pending!.request().url()))]) });
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  await expect(page.getByText("INV-STALE")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Generate", exact: true })).toBeEnabled();
});

test("failed CSV response shows the server explanation and never downloads a JSON error", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: [] });
  let downloaded = false;
  page.on("download", () => { downloaded = true; });
  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([invoice]) }));
  await page.route(/\/reports\/INVOICE_COLLECTIONS\?/, route => route.fulfill({ json: envelope([resultFor(invoice, "INV-EXPORT", new URL(route.request().url()))]) }));
  await page.route("**/reports/INVOICE_COLLECTIONS/export**", route => route.fulfill({ status: 403,
    json: { success: false, description: "Your current profile cannot export this report." } }));
  await page.goto("/dashboard/reports");
  await expect(page.getByText("INV-EXPORT")).toBeVisible();
  await page.getByRole("button", { name: "Export CSV" }).click();
  await expect(page.getByText("Your current profile cannot export this report.")).toBeVisible();
  expect(downloaded).toBe(false);
});

test("successful HTTP status with JSON instead of CSV is rejected", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: [] });
  let downloaded = false;
  page.on("download", () => { downloaded = true; });
  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([invoice]) }));
  await page.route(/\/reports\/INVOICE_COLLECTIONS\?/, route => route.fulfill({ json: envelope([resultFor(invoice, "INV-NOT-CSV", new URL(route.request().url()))]) }));
  await page.route("**/reports/INVOICE_COLLECTIONS/export**", route => route.fulfill({ json: { success: false } }));
  await page.goto("/dashboard/reports");
  await expect(page.getByText("INV-NOT-CSV")).toBeVisible();
  await page.getByRole("button", { name: "Export CSV" }).click();
  await expect(page.getByText("The CSV export could not be downloaded. Try again.")).toBeVisible();
  expect(downloaded).toBe(false);
});

test("snapshot reports refresh without date inputs and can export an empty period", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: [] });
  const snapshot = { ...invoice, code: "OCCUPANCY_RENT_ROLL", title: "Occupancy", dateMode: "SNAPSHOT", supportsDateRange: false };
  let generated = 0;
  await page.route("**/reports/catalog", route => route.fulfill({ json: envelope([snapshot]) }));
  await page.route(/\/reports\/OCCUPANCY_RENT_ROLL\?/, route => {
    ++generated;
    return route.fulfill({ json: envelope([{ ...resultFor(snapshot, "", new URL(route.request().url())), metrics: { Units: 0 }, rows: [] }]) });
  });
  await page.route("**/reports/OCCUPANCY_RENT_ROLL/export**", route => route.fulfill({ body: '"Reference","Status"\r\n', contentType: "text/csv" }));
  await page.goto("/dashboard/reports");
  await expect(page.getByText("No records were found for this period.")).toBeVisible();
  await expect(page.getByLabel("From", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect.poll(() => generated).toBe(2);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  await download;
});
