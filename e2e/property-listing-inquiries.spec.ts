import { expect, test } from "@playwright/test";
import { authenticated } from "./support";

test("listing owner sees requester email and phone with the exact listing", async ({ context, page }) => {
  await authenticated(context, page, {
    title: "Landlord",
    permissions: ["advertise_unit"],
  });
  await page.route("**/property/listings/inquiries?size=50", (route) =>
    route.fulfill({
      json: {
        content: [
          {
            id: 18,
            listingSlug: "atlas-court-two-bedroom-test",
            listingHeadline: "Two bedroom at Atlas Court",
            name: "Amina Wanjiku",
            email: "amina@example.com",
            phone: "+254700000000",
            message: "Please arrange a viewing.",
            status: "NEW",
            createdOn: "2026-09-20T08:00:00Z",
          },
        ],
      },
    }),
  );

  await page.goto("/dashboard/property-listing-inquiries");

  await expect(page.getByText("Requester email")).toBeVisible();
  await expect(page.getByRole("link", { name: "amina@example.com" })).toHaveAttribute(
    "href",
    "mailto:amina@example.com",
  );
  await expect(page.getByText("Requester phone")).toBeVisible();
  await expect(page.getByRole("link", { name: "+254700000000" })).toHaveAttribute(
    "href",
    "tel:+254700000000",
  );
  await expect(page.getByRole("link", { name: /Two bedroom at Atlas Court/ })).toHaveAttribute(
    "href",
    "/property/atlas-court-two-bedroom-test",
  );
});
