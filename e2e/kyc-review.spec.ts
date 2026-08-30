import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

const requirements = [
  {
    code: "IDENTITY",
    label: "Identity document",
    required: true,
    acceptedTypes: ["NATIONAL_ID_FRONT", "PASSPORT"],
  },
  {
    code: "TAX",
    label: "KRA PIN certificate",
    required: true,
    acceptedTypes: ["KRA_PIN_CERTIFICATE"],
  },
];

const documents = [
  {
    id: 81,
    documentType: "NATIONAL_ID_FRONT",
    originalFileName: "national-id.pdf",
    contentType: "application/pdf",
    status: "OCR_COMPLETE",
    qualityStatus: "PASSED",
    qualityScore: 88,
    ocrConfidence: 91,
    extractedFields: {
      documentNumber: "12345678",
      fullName: "SlickHood Test Owner",
      "_confidence.documentNumber": "97",
    },
    uploadedAt: "2026-08-30T10:00:00Z",
  },
  {
    id: 82,
    documentType: "KRA_PIN_CERTIFICATE",
    originalFileName: "kra-pin.pdf",
    contentType: "application/pdf",
    status: "OCR_COMPLETE",
    qualityStatus: "PASSED",
    qualityScore: 90,
    ocrConfidence: 94,
    extractedFields: {
      taxPin: "A123456789B",
      fullName: "SlickHood Test Owner",
    },
    uploadedAt: "2026-08-30T10:01:00Z",
  },
];

test("admin reviews OCR and originals, accepts good evidence and returns only the inaccurate document", async ({
  context,
  page,
}) => {
  await authenticated(context, page, {
    title: "Superadmin",
    permissions: ["list_users"],
  });
  let queue = [
    {
      userId: 501,
      fullName: "SlickHood Test Owner",
      email: "owner.e2e@slickhood.test",
      kycCase: {
        id: 44,
        status: "SUBMITTED",
        accountStatus: "KYC_UNDER_REVIEW",
        consentVersion: "2026-08",
        phoneVerified: true,
        requirements,
        missingRequirementCodes: [],
        documents,
      },
    },
  ];
  let review: Record<string, unknown> | undefined;
  await page.route("**/kyc/admin/queue", (route) =>
    route.fulfill({ json: envelope(queue) }),
  );
  await page.route("**/kyc/admin/44/review", async (route) => {
    review = route.request().postDataJSON();
    queue = [];
    await route.fulfill({
      json: envelope([{ ...queue[0]?.kycCase, status: "REJECTED" }]),
    });
  });

  await page.goto("/dashboard/kyc-review");
  await expect(
    page.getByRole("heading", { name: "Customer KYC requests" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review request" }).click();
  await expect(
    page.getByRole("heading", { name: "SlickHood Test Owner" }),
  ).toBeVisible();
    await expect(page.getByText("12345678 (97%)", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "View protected original" }).first(),
  ).toBeVisible();

  const identity = page.locator("article").filter({ hasText: "National Id Front" });
  const tax = page
    .locator("article")
    .filter({ hasText: "Kra Pin Certificate" });
  await identity.getByRole("button", { name: "Reject document" }).click();
  await identity
    .getByLabel("Correction reason for National Id Front")
    .fill("The identification number is obscured by glare.");
  await tax.getByRole("button", { name: "Accept document" }).click();
  await page
    .getByRole("button", { name: "Request document correction" })
    .click();

  expect(review).toMatchObject({
    decision: "REJECTED",
    documents: [
      {
        documentId: 81,
        approved: false,
        reason: "The identification number is obscured by glare.",
      },
      { documentId: 82, approved: true },
    ],
  });
  await expect(page.getByText("No KYC requests require attention.")).toBeVisible();
});

test("customer sees the exact rejection reason, retains accepted evidence and replaces only the bad upload", async ({
  context,
  page,
}) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: [],
  });
  await page.unroute("**/kyc/current");
  let current = {
    id: 44,
    status: "REJECTED",
    accountStatus: "KYC_REJECTED",
    consentVersion: "2026-08",
    reviewNotes: "One document needs correction.",
    phoneVerified: true,
    verifiedPhoneNumber: "+254700000001",
    requirements,
    missingRequirementCodes: ["IDENTITY"],
    documents: [
      {
        ...documents[0],
        status: "REJECTED",
        rejectionReason: "The identification number is obscured by glare.",
      },
      { ...documents[1], status: "VERIFIED" },
    ],
  };
  await page.route("**/kyc/current", (route) =>
    route.fulfill({ json: envelope([current]) }),
  );
  await page.route("**/kyc/documents", async (route) => {
    current = {
      ...current,
      status: "IN_PROGRESS",
      accountStatus: "PENDING_KYC",
      missingRequirementCodes: [],
      documents: [
        {
          ...documents[0],
          id: 91,
          originalFileName: "replacement-id.pdf",
          status: "OCR_COMPLETE",
          rejectionReason: undefined,
          uploadedAt: "2026-08-30T11:00:00Z",
        },
        { ...documents[1], status: "VERIFIED" },
      ],
    };
    await route.fulfill({ json: envelope([current.documents[0]]) });
  });
  await page.route("**/kyc/submit", async (route) => {
    current = {
      ...current,
      status: "SUBMITTED",
      accountStatus: "KYC_UNDER_REVIEW",
    };
    await route.fulfill({ json: envelope([current]) });
  });

  await page.goto("/kyc");
  await expect(
    page.getByText("The identification number is obscured by glare."),
  ).toBeVisible();
  await expect(
    page.getByText("Replace or upload: Identity document."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Replace this document" }),
  ).toHaveCount(1);

  const identity = page.locator("article").filter({ hasText: "Identity document" });
  await identity.locator('input[type="file"]').setInputFiles({
    name: "replacement-id.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n% SlickHood E2E"),
  });
  await expect(
    page.getByText("The identification number is obscured by glare."),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Submit for review/ }).click();
  await expect(
    page.getByRole("heading", { name: "Verification under review" }),
  ).toBeVisible();
});
