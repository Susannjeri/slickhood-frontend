import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

const requirement = {
  id: 11,
  scopeType: "PROVIDER_TYPE",
  scopeKey: "DELIVERY_RIDER",
  scopeLabel: "Delivery rider",
  requirementCode: "GOOD_CONDUCT",
  requirementLabel: "Certificate of good conduct",
  obligation: "MANDATORY",
  profileScope: "INDIVIDUAL",
  acceptedDocumentTypes: "GOOD_CONDUCT_CERTIFICATE",
  conditionDescription: "Required before delivery assignment.",
  validityDays: 365,
  renewalLeadDays: 30,
  active: true,
};

test("superadmin previews the governed KYC matrix before publication", async ({
  context,
  page,
}) => {
  await authenticated(context, page, {
    title: "Superadmin",
    permissions: ["list_users"],
  });
  const published = {
    release: {
      id: 1,
      versionNo: 1,
      status: "PUBLISHED",
      changeSummary: "Initial matrix",
    },
    requirements: [requirement],
  };
  const draft = {
    release: { id: 2, versionNo: 2, status: "DRAFT" },
    requirements: [requirement],
  };
  await page.route("**/kyc/admin/matrix/draft", (route) =>
    route.fulfill({ json: envelope([draft]) }),
  );
  await page.route("**/kyc/admin/matrix/history", (route) =>
    route.fulfill({ json: envelope([published.release, draft.release]) }),
  );
  await page.route("**/kyc/admin/matrix/preview", (route) =>
    route.fulfill({
      json: envelope([
        { published, draft, added: 0, changed: 0, deactivated: 0 },
      ]),
    }),
  );

  await page.goto("/dashboard/kyc-requirements");
  await expect(page.getByText("Certificate of good conduct")).toBeVisible();
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(
    page.getByRole("dialog", { name: "Preview KYC matrix" }),
  ).toBeVisible();
  await expect(page.getByText("Published v1 → draft v2")).toBeVisible();
});

test("superadmin verifies a linked rider through the rider directory", async ({
  context,
  page,
}) => {
  await authenticated(context, page, {
    title: "Superadmin",
    permissions: ["list_users"],
  });
  let verified = false;
  await page.route("**/soko/admin/riders/*/decision", async (route) => {
    verified = true;
    await route.fulfill({ json: envelope([]) });
  });
  await page.route("**/soko/admin/riders**", async (route) => {
    await route.fulfill({
      json: envelope([
        {
          id: 7,
          displayName: "Amina Rider",
          email: "amina@example.test",
          phoneNumber: "0700000000",
          vehicleType: "MOTORBIKE",
          vehiclePlate: "KAA 001A",
          status: verified ? "ACTIVE" : "OFFLINE",
          verificationStatus: verified ? "VERIFIED" : "PENDING",
          verified,
        },
      ]),
    });
  });

  await page.goto("/dashboard/rider-verification");
  await expect(page.getByText("Amina Rider")).toBeVisible();
  const decision = page.waitForRequest(
    (request) =>
      request.method() === "PUT" &&
      request.url().includes("/soko/admin/riders/7/decision"),
  );
  await page.getByRole("button", { name: "Verify and activate" }).click();
  await decision;
  await expect(page.getByText("VERIFIED")).toBeVisible();
  await expect(page.getByRole("button", { name: "Suspend" })).toBeVisible();
});
