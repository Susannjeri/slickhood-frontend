import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

const visitor = (status: string) => ({
  id: 81, visitorName: "Amina Guest", phoneNumber: "+254111222333", vehiclePlate: "KDA123A",
  expectedArrivalTime: "2027-09-01T10:00:00Z", validFrom: "2027-09-01T08:00:00Z",
  validUntil: "2027-09-01T18:00:00Z", parkingLot: "A4", chargeable: false, status,
  unitId: 17, propertyId: 4, unitRef: "A-17", propertyName: "Acacia Court",
  createdOn: "2027-08-31T10:00:00Z", visitorCategory: "GUEST", visitType: "DRIVE_IN",
  entryCount: 0, maxEntries: 2, requiresApproval: status === "PENDING_APPROVAL",
});

const localInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

test("resident issues a time-bound multi-entry drive-in credential", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["register_visitor", "view_visitor_list", "cancel_visitor", "delete_visitor"] });
  await page.route("**/property/unit/list/by/resident", route => route.fulfill({ json: envelope([{ unitId: 17, propertyId: 4, unitRef: "A-17", propertyName: "Acacia Court" }]) }));
  await page.route("**/visitor/list**", route => route.fulfill({ json: envelope([]) }));
  let requestBody: Record<string, unknown> | undefined;
  await page.route("**/visitor/access/register", async route => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ json: envelope({ visit: visitor("APPROVED"), accessCode: "credential-issued-once" }) });
  });

  await page.goto("/dashboard/visitors");
  await page.getByRole("button", { name: "Register Visitor" }).click();
  const dialog = page.getByRole("dialog", { name: "Register Visitor" });
  await dialog.getByLabel("Visitor Name").fill("Amina Guest");
  await page.getByPlaceholder("e.g. 0700000000").fill("0111222333");
  await page.getByRole("button", { name: "Drive in" }).click();
  await dialog.getByLabel("Unit").selectOption("17");
  const dateInputs = dialog.locator('input[type="datetime-local"]');
  const arrival = localInput(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const expiry = localInput(new Date(Date.now() + 32 * 60 * 60 * 1000));
  await dateInputs.nth(0).fill(arrival);
  await dateInputs.nth(1).fill(expiry);
  await page.getByLabel("Maximum entries").fill("2");
  await page.getByPlaceholder("e.g. KDA 123A").fill("KDA 123A");
  await page.getByRole("button", { name: "Register", exact: true }).click();

  await expect(page.getByText(/credential-issued-once/)).toBeVisible();
  expect(requestBody).toMatchObject({ unitId: 17, visitType: "DRIVE_IN", vehiclePlate: "KDA 123A", maxEntries: 2 });
  expect(requestBody?.validUntil).toBe(expiry.replace("T", " ") + ":00");
});

test("guard records an approved vehicle entry with identity evidence", async ({ context, page }) => {
  await authenticated(context, page, { title: "Guard", permissions: ["view_visitor_list", "update_visitor_status"] });
  await page.route("**/visitor/list**", route => route.fulfill({ json: envelope([visitor("APPROVED")]) }));
  let requestBody: Record<string, unknown> | undefined;
  await page.route("**/visitor/81/status", async route => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({ json: envelope([]) });
  });

  await page.goto("/dashboard/visitor-management");
  await page.getByRole("button", { name: "Check In" }).click();
  await expect.poll(() => requestBody).toEqual({ status: "CHECKED_IN", vehiclePlate: "KDA123A" });
});
