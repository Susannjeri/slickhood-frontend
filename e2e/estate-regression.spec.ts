import { expect, test, Page } from "@playwright/test";
import { authenticated, envelope } from "./support";

const estates = [{ id: 11, name: "Cedar Estate", managementMode: "SERVICE_CHARGE" }, { id: 12, name: "Palm Estate", managementMode: "SERVICE_CHARGE" }];
const owner = (propertyId = 11, id = 9) => ({ id, propertyId, propertyName: propertyId === 11 ? "Cedar Estate" : "Palm Estate", unitId: id + 60, unitRef: `HOME-${id}`, homeownerUserId: 200 + id, homeownerName: `Homeowner ${id}`, homeownerEmail: `owner${id}@example.test`, ownershipStart: "2026-01-01", active: true });
const permissions = ["view_estate", "manage_estate", "view_service_charge", "create_service_charge", "view_invoice_list"];
async function emptyOperations(page: Page) {
  await page.route("**/property/list**", route => route.fulfill({ json: { ...envelope(estates), totalPages: 1 } }));
  await page.route("**/property/unit/list**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/estate/operations/properties/*/**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/estate/service-charges**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/estate/ownership**", route => route.fulfill({ json: envelope([owner(Number(new URL(route.request().url()).searchParams.get("propertyId")) || 11)]) }));
}

test("failed homeowner billing is unavailable, not a zero balance", async ({ context, page }) => {
  await authenticated(context, page, { title: "Homeowner", permissions: ["view_estate", "view_service_charge"] });
  await emptyOperations(page);
  await page.route("**/estate/service-charges**", route => route.fulfill({ status: 503 }));
  await page.goto("/dashboard/estate");
  await expect(page.getByRole("button", { name: "Retry service charges" })).toBeVisible();
  await expect(page.getByText("Unavailable", { exact: true })).toHaveCount(2);
  await expect(page.getByText("KES 0.00", { exact: true })).toHaveCount(0);
});

test("loading more budgets preserves the active tab and nested budget identities", async ({ context, page }) => {
  await authenticated(context, page, { title: "EstateManager", permissions, propertyIds: [11], propertyNames: ["Cedar Estate"] });
  await emptyOperations(page);
  await page.route("**/estate/operations/properties/11/budgets**", route => {
    const pageNumber = Number(new URL(route.request().url()).searchParams.get("page"));
    return route.fulfill({ json: { ...envelope([{ budget: { id: pageNumber + 1, propertyId: 11, name: `Estate budget ${pageNumber + 1}`, budgetYear: 2026 - pageNumber, status: "APPROVED", currency: "KES" }, lines: [], plannedTotal: 0, actualTotal: 0 }]), totalPages: 2, totalElements: 2 } });
  });
  await page.goto("/dashboard/estate?propertyId=11");
  await page.getByRole("tab", { name: "Budgets", exact: true }).click();
  await page.getByRole("button", { name: "Load more budgets", exact: true }).click();
  await expect(page.getByText("Estate budget 2 · 2025", { exact: true })).toBeVisible();
  await expect(page.getByText("Estate budget 1 · 2026", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Budgets", exact: true })).toHaveAttribute("data-state", "active");
});

test("ownership remains usable when billing fails and retry recovers", async ({ context, page }) => {
  await authenticated(context, page, { title: "EstateManager", permissions, propertyIds: [11], propertyNames: ["Cedar Estate"] });
  await emptyOperations(page);
  let failing = true;
  await page.route("**/estate/service-charges**", route => route.fulfill(failing ? { status: 503, json: { description: "Billing temporarily unavailable" } } : { json: envelope([]) }));
  await page.goto("/dashboard/estate?propertyId=11");
  await expect(page.getByRole("button", { name: "End ownership" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry service charges" })).toBeVisible();
  failing = false;
  await page.getByRole("button", { name: "Retry service charges" }).click();
  await expect(page.getByText("No service charges for this role.")).toBeVisible();
});

test("read-only estate viewer does not request an unauthorized billing feed", async ({ context, page }) => {
  await authenticated(context, page, { title: "WorkspaceViewer", permissions: ["view_estate"], propertyIds: [11], propertyNames: ["Cedar Estate"] });
  await emptyOperations(page);
  let requestedBilling = false;
  await page.route("**/estate/service-charges**", route => { requestedBilling = true; return route.fulfill({ status: 403 }); });
  await page.goto("/dashboard/estate?propertyId=11");
  await expect(page.getByText("Homeowner 9", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estate Management" }).last()).toBeVisible();
  await expect(page.getByRole("button", { name: "Create invoice" })).toHaveCount(0);
  expect(requestedBilling).toBe(false);
});

test("estate pagination preserves records and paid amounts are not shown as zero", async ({ context, page }) => {
  await authenticated(context, page, { title: "Homeowner", permissions: ["view_estate", "view_service_charge", "view_invoice_list"] });
  await emptyOperations(page);
  await page.route("**/estate/ownership**", route => {
    const params = new URL(route.request().url()).searchParams;
    const id = params.get("page") === "1" ? 10 : 9;
    return route.fulfill({ json: { ...envelope([owner(11, id)]), totalPages: 2, totalElements: 26 } });
  });
  await page.route("**/estate/service-charges**", route => route.fulfill({ json: envelope([{ id: 1, propertyId: 11, propertyName: "Cedar Estate", unitId: 69, unitRef: "HOME-9", homeownerUserId: 209, invoiceId: 44, invoiceRef: "INV-44", amount: 1500, currency: "KES", dueDate: "2026-08-01", description: "Security charge", paid: true, pendingAmount: 0, status: "PAID" }]) }));
  await page.goto("/dashboard/estate");
  await expect(page.getByText("KES 1,500.00 paid", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Load more ownership records/ }).click();
  await expect(page.getByText("Homeowner 10", { exact: true })).toBeVisible();
  await expect(page.getByText("Homeowner 9", { exact: true })).toBeVisible();
});

test("changing estate clears invoice recipient and resets operations context", async ({ context, page }) => {
  await authenticated(context, page, { title: "EstateManager", permissions, propertyIds: [11, 12], propertyNames: ["Cedar Estate", "Palm Estate"] });
  await emptyOperations(page);
  await page.goto("/dashboard/estate?propertyId=11");
  await page.getByRole("combobox", { name: "Homeowner / home" }).click();
  await page.getByRole("option", { name: /Homeowner 9.*Cedar/ }).click();
  await page.getByRole("tab", { name: "Common work" }).click();
  await page.getByText("Create common-area work order", { exact: true }).click();
  await page.getByLabel("Estate", { exact: true }).click();
  await page.getByRole("option", { name: "Palm Estate", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Homeowner / home" })).toContainText("Select current ownership");
  await expect(page.getByRole("button", { name: "Create invoice", exact: true })).toBeDisabled();
  await expect(page.getByRole("tab", { name: "Meetings" })).toHaveAttribute("data-state", "active");
  await expect(page.getByRole("combobox", { name: "Operations property" })).toHaveCount(0);
});

test("late response from prior estate cannot replace selected estate records", async ({ context, page }) => {
  await authenticated(context, page, { title: "EstateManager", permissions, propertyIds: [11, 12], propertyNames: ["Cedar Estate", "Palm Estate"] });
  await emptyOperations(page);
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/estate/ownership**", async route => {
    const propertyId = Number(new URL(route.request().url()).searchParams.get("propertyId")) || 11;
    if (propertyId === 11) await delayed;
    await route.fulfill({ json: envelope([owner(propertyId, propertyId)]) });
  });
  await page.goto("/dashboard/estate?propertyId=11");
  await page.getByLabel("Estate", { exact: true }).click();
  await page.getByRole("option", { name: "Palm Estate", exact: true }).click();
  await expect(page.getByText("Homeowner 12", { exact: true })).toBeVisible();
  release();
  await expect(page.getByText("Homeowner 11", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Homeowner 12", { exact: true })).toBeVisible();
});

test("failed budget request does not hide meetings", async ({ context, page }) => {
  await authenticated(context, page, { title: "Homeowner", permissions: ["view_estate", "view_service_charge"] });
  await emptyOperations(page);
  await page.route("**/estate/operations/properties/11/budgets**", route => route.fulfill({ status: 503 }));
  await page.route("**/estate/operations/properties/11/meetings**", route => route.fulfill({ json: envelope([{ id: 2, propertyId: 11, title: "Homeowner annual meeting", scheduledAt: "2026-10-01T10:00:00Z", status: "SCHEDULED", quorumRequired: 2, attendeeCount: 0 }]) }));
  await page.goto("/dashboard/estate");
  await expect(page.getByText("Homeowner annual meeting", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry estate operations" })).toBeVisible();
});
