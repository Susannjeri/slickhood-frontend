import { expect, test } from "@playwright/test";
import { authenticated, envelope, testToken } from "./support";

test("selected business area invisibly carries the correct role into registration", async ({ page }) => {
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/role/list", route => route.fulfill({ json: envelope([
    { roleId: 101, roleName: "Landlord", roleDescription: "Own and manage rental property", selfAssignable: true, recommended: true },
    { roleId: 102, roleName: "ServiceProvider", roleDescription: "Offer trusted services", selfAssignable: true },
    { roleId: 999, roleName: "Superadmin", roleDescription: "Administration", selfAssignable: false },
  ]) }));

  let registration: Record<string, unknown> | undefined;
  await page.route("**/auth/register", async route => {
    registration = route.request().postDataJSON();
    await route.fulfill({ json: envelope([{ userId: 501 }]) });
  });

  await page.goto("/role");
  await expect(page.getByRole("heading", { name: "Choose your business area" })).toBeVisible();
  await expect(page.getByText("Choose your SlickHood role")).toHaveCount(0);
  await page.locator("article").filter({ hasText: "Rental Management" }).getByRole("button", { name: "Choose this area" }).click();
  await expect(page).toHaveURL(/\/register$/);

  await page.getByPlaceholder("Enter your full name").fill("SlickHood Test Owner");
  await page.getByPlaceholder("Enter your email").fill("Owner.E2E@SlickHood.Test");
  await page.getByPlaceholder("Create a password").fill("StrongPass1!");
  await page.getByPlaceholder("Confirm your password").fill("StrongPass1!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("dialog", { name: /Review & accept our policies/i })).toBeVisible();
  const policies = [
    ["T&C", "I have read and agree to the Terms & Conditions."],
    ["Privacy", "I have read and agree to the Privacy Policy."],
    ["AUP", "I have read and agree to the Acceptable Use Policy."],
    ["Data", "I have read and agree to the Data Protection & Privacy Policy."],
    ["Age", "I confirm I am 18 years or older and legally capable of entering a binding agreement."],
  ];
  for (const [tab, checkbox] of policies) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await page.getByRole("checkbox", { name: checkbox }).check();
  }
  await page.getByRole("button", { name: "Accept & continue" }).click();
  await expect(page).toHaveURL(/\/verify-code$/);
  expect(registration).toMatchObject({
    fullName: "SlickHood Test Owner",
    email: "owner.e2e@slickhood.test",
    roleId: 101,
  });
  expect(registration?.password).toBe("StrongPass1!");
});

test("trial duration comes from policy and activation remains attached to the selected role", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: [] });
  const plan = {
    uuid: "plan-bronze-monthly",
    code: "LANDLORD_BRONZE_MONTHLY",
    displayName: "Bronze",
    planCategory: "RENTAL",
    roleFamily: "LANDLORD",
    billingCycle: "MONTHLY",
    price: 1000,
    currency: "KES",
    active: true,
    features: [{ featureKey: "MPESA_PAYMENTS", enabled: true }],
    quotas: [{ metricKey: "UNITS", limitValue: 10 }],
  };
  await page.route("**/subscription/plans**", route => route.fulfill({ json: envelope([plan]) }));
  await page.route("**/subscription/trial-policy**", route => route.fulfill({ json: envelope([{ durationDays: 21 }]) }));
  await page.route("**/subscription/current**", route => route.fulfill({ json: envelope([]) }));
  let trialRequest: Record<string, unknown> | undefined;
  await page.route("**/subscription/trial", async route => {
    trialRequest = route.request().postDataJSON();
    await route.fulfill({ json: envelope([{
      uuid: "subscription-501",
      role: "LANDLORD",
      planCode: plan.code,
      status: "ACTIVE",
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 21 * 86400000).toISOString(),
      autoRenew: false,
      planDetails: plan,
    }]) });
  });

  await page.goto("/business-areas/plans?area=property-management");
  await expect(page.getByText("Choose your Rental Management package")).toBeVisible();
  await expect(page.getByText(/21-day free trial/i)).toBeVisible();
  await page.getByRole("button", { name: "Start Free Trial" }).click();
  await expect(page.getByText(/Subscription active for Landlord/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bronze" })).toBeVisible();
  expect(trialRequest).toEqual({ role: "LANDLORD", planCode: "LANDLORD_BRONZE_MONTHLY" });
});

test("adding a business area rechecks KYC before exposing the new workspace", async ({ context, page }) => {
  const landlord = { title: "Landlord", permissions: [] };
  await authenticated(context, page, landlord);
  await page.route("**/role/list", route => route.fulfill({ json: envelope([
    { roleId: 101, roleName: "Landlord", selfAssignable: true },
    { roleId: 103, roleName: "SalesAgent", selfAssignable: true },
  ]) }));
  await page.route("**/role/self-assign?roleId=103", route => route.fulfill({ json: envelope([{ roleId: 103, kycRequired: true }]) }));
  await page.route("**/browser-session/refresh", route => route.fulfill({ json: envelope([]) }));
  let tokenReads = 0;
  await page.route("**/browser-session/get-token", route => {
    tokenReads += 1;
    const roles = tokenReads === 1 ? [landlord] : [landlord, { title: "SalesAgent", permissions: [] }];
    return route.fulfill({ json: { data: { jwt: testToken(roles) } } });
  });
  await page.route("**/kyc/current", route => route.fulfill({ json: envelope([{
    id: 44, status: "IN_PROGRESS", accountStatus: "PENDING_KYC", consentVersion: "2026-08",
    phoneVerified: true, requirements: [], missingRequirements: ["SALES_AUTHORITY"], documents: [],
  }]) }));

  await page.goto("/business-areas");
  const sales = page.locator("article").filter({ hasText: "Property Sales" });
  await expect(sales.getByRole("button", { name: "Add business area" })).toBeVisible();
  await sales.getByRole("button", { name: "Add business area" }).click();
  await expect(page).toHaveURL(/\/kyc$/);
});

test("KYC phone verification accepts Kenyan 01 ranges and offers a protected resend flow", async ({ context, page }) => {
  await authenticated(context, page, { title: "Landlord", permissions: [] });
  await page.unroute("**/kyc/current");
  await page.route("**/kyc/current", route => route.fulfill({ json: envelope([{
    id: 45, status: "IN_PROGRESS", accountStatus: "PENDING_KYC", consentVersion: "2026-08",
    phoneVerified: false, requirements: [], missingRequirements: [], documents: [],
  }]) }));
  let requestedContact = "";
  await page.route("**/user/verify/contact", route => {
    requestedContact = route.request().postDataJSON().contact ?? "";
    return route.fulfill({ json: envelope([]) });
  });
  let submittedOtp = "";
  await page.route("**/user/update/contact", route => {
    submittedOtp = route.request().postDataJSON().otp ?? "";
    return route.fulfill({ json: envelope([]) });
  });

  await page.goto("/kyc");
  await page.getByPlaceholder("+2547XXXXXXXX").fill("+254111379961");
  await page.getByRole("button", { name: "Send code" }).click();

  expect(requestedContact).toBe("+254111379961");
  await expect(page.getByRole("button", { name: /Resend code in 60s/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Use a different number" })).toBeVisible();

  await page.getByPlaceholder("Verification code").fill("3HZTD7");
  await page.getByRole("button", { name: "Confirm phone" }).click();

  expect(submittedOtp).toBe("3HZTD7");
  await expect(page.getByText("Your phone number has been verified successfully.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Phone number verified" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm phone" })).toHaveCount(0);
});
