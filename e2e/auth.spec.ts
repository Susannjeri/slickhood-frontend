import { expect, test } from "@playwright/test";
import { authenticated, envelope, testToken } from "./support";

test("an unauthenticated dashboard visit is sent to sign in", async ({ page }) => {
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.goto("/dashboard/privacy");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("sign-in form validates malformed credentials before the API call", async ({ page }) => {
  let loginCalls = 0;
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/auth/login", route => { loginCalls += 1; return route.abort(); });
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill("not-an-email");
  await page.getByPlaceholder("••••••••").fill("short");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email")).toBeVisible();
  expect(loginCalls).toBe(0);
});

test("sign in remains available when a previous registration stopped at verification", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("auth-storage", JSON.stringify({
      state: {
        email: "unfinished@example.test",
        step: "verify",
        roleId: 1,
        inviteToken: null,
        roles: [],
        roleName: [],
        permissions: [],
        propertyIds: [],
        propertyNames: [],
        activeRole: null,
      },
      version: 0,
    }));
  });
  await page.route("https://accounts.google.com/**", route => route.abort());

  await page.goto("/login");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("an unverified account is sent to email verification instead of a tokenless dashboard", async ({ page }) => {
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/auth/login", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      code: "EMAIL_OTP_GENERATED",
      description: "A verification code was sent to your email.",
      data: ["verification-code-generated"],
    }),
  }));

  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill("owner@example.test");
  await page.getByPlaceholder("••••••••").fill("ValidPass1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/verify-code$/);
  await expect(page.getByRole("heading", { name: "Verify your email" })).toBeVisible();
  await expect(page.getByText("owner@example.test")).toBeVisible();
  await expect(page.getByRole("button", { name: /Resend in 60s/ })).toBeDisabled();
  await expect(page.getByText(/Use only the newest code/)).toBeVisible();
});

test("a successful credential login creates the secure session and leaves the login page", async ({ page, context }) => {
  const jwt = testToken([
    { title: "Landlord", permissions: [] },
    { title: "ServiceProvider", permissions: [] },
  ]);
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/auth/login", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(envelope([{
      jwt,
      refreshToken: "refresh-token-longer-than-sixteen-characters",
      totpEnabled: false,
      mfaSetup: true,
    }])),
  }));
  await page.route("**/kyc/current", route => route.fulfill({ json: envelope([{
    status: "APPROVED", accountStatus: "ACTIVE", phoneVerified: true,
    requirements: [], missingRequirements: [], documents: [],
  }]) }));
  await page.route("**/subscription/current**", route => route.fulfill({ json: envelope([]) }));

  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill("  Owner@Example.com ");
  await page.getByPlaceholder("••••••••").fill("ValidPass1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).not.toHaveURL(/\/login$/);
  const cookies = await context.cookies();
  expect(cookies.find(cookie => cookie.name === "token")?.httpOnly).toBe(true);
  expect(cookies.find(cookie => cookie.name === "refreshToken")?.httpOnly).toBe(true);
});

test("an expired access cookie cannot trap the user in a login-dashboard redirect loop", async ({ page, context }) => {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const expired = `${encode({ alg: "none" })}.${encode({ sub: "expired", exp: 1, roles: [] })}.expired`;
  await context.addCookies([{ name: "token", value: expired, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.route("https://accounts.google.com/**", route => route.abort());

  await page.goto("/login");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("a replaced single session explains why another sign in is required", async ({ page }) => {
  await page.route("https://accounts.google.com/**", route => route.abort());

  await page.goto("/login?reason=session-ended");

  await expect(page.getByText("Your previous session ended or was replaced by a newer sign-in. Please sign in again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

test("a bound staff invitation survives validation and offers sign-in before registration", async ({ page }) => {
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/invite/inspect**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      code: "S00127",
      description: "Link is valid.",
      data: [{ type: "TEAM", expiresAt: "2026-10-01T00:00:00", validForSeconds: 86400 }],
    }),
  }));
  await page.route("**/invite/validate**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      code: "S00141",
      description: "Use this invitation to join SlickHood.",
      data: [],
    }),
  }));

  await page.goto("/lease/onboard?token=insurance-invite-token");

  await expect(page).toHaveURL(/\/login\?invitation=ready&token=insurance-invite-token$/);
  await expect(page.getByTestId("invitation-ready")).toContainText("Sign in with the invited email");
  // Simulate browser/email privacy controls discarding persisted state. The
  // email-bound token in the URL must still survive the registration handoff.
  await page.evaluate(() => window.localStorage.removeItem("auth-storage"));
  await page.reload();
  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/register\?token=insurance-invite-token$/);
  const storedInvite = await page.evaluate(() => {
    const stored = JSON.parse(window.localStorage.getItem("auth-storage") || "{}");
    return stored?.state?.inviteToken;
  });
  expect(storedInvite).toBe("insurance-invite-token");
});

test("a tenant invitation survives sign-in and returns to lease initialization", async ({ page }) => {
  const jwt = testToken([{ title: "Tenant", permissions: ["create_new_lease"] }]);
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/invite/inspect**", route => route.fulfill({ json: {
    success: true, code: "S00127", description: "Link is valid.",
    data: [{ type: "TENANT", expiresAt: "2026-10-01T00:00:00", validForSeconds: 86400 }],
  } }));
  await page.route("**/invite/validate**", route => route.fulfill({ json: {
    success: true, code: "S0058", description: "Tenant invite",
    data: { unit: {
      propertyId: 11, unitId: 77, ref: "A-101", propertyType: "APARTMENT",
      unitType: "APARTMENT", size: 85, measurementUnits: { id: 1, name: "sqm" },
      utilities: [], leaseMode: "RENT", price: 25000, currency: "KES",
      occupied: false, advertise: false, thumbnail: "", images: [], templateId: 9,
    }, leaseStartDate: "2026-10-01", leaseEndDate: "2027-09-30" },
  } }));
  await page.route("**/property/type", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/property/unit/type**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/property/unit/charges?**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/lease/template/public**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/auth/login", route => route.fulfill({ json: envelope([{
    jwt, refreshToken: "tenant-refresh-token-long-enough", totpEnabled: false, mfaSetup: true,
  }]) }));
  await page.route("**/browser-session/refresh", route => route.fulfill({ json: { success: true } }));

  await page.goto("/lease/onboard?token=tenant-bound-token");
  await expect(page).toHaveURL(/\/lease\/initialize\?token=tenant-bound-token$/);
  await expect(page.getByText("Unit A-101")).toBeVisible();
  await expect(page.getByRole("button", { name: "View Lease Agreement" })).toHaveCount(0);
  await page.getByRole("button", { name: "Sign in and continue" }).click();
  await expect(page).toHaveURL(/\/login\?.*returnTo=%2Flease%2Finitialize/);
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
    "href",
    /\/forgot-password\?.*token=tenant-bound-token.*returnTo=%2Flease%2Finitialize/,
  );
  await page.getByPlaceholder("you@example.com").fill("tenant@example.com");
  await page.getByPlaceholder("••••••••").fill("ValidPass1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/lease\/initialize\?token=tenant-bound-token$/);
  const storedInvite = await page.evaluate(() => JSON.parse(localStorage.getItem("auth-storage") || "{}").state?.inviteToken);
  expect(storedInvite).toBe("tenant-bound-token");
});

test("an expired invitation is cleared before sign-in and no longer controls the login page", async ({ page }) => {
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/invite/inspect**", route => route.fulfill({
    status: 409,
    contentType: "application/json",
    body: JSON.stringify({ success: false, code: "S00128", description: "Link has expired or is invalid.", data: [] }),
  }));
  await page.addInitScript(() => {
    localStorage.setItem("auth-storage", JSON.stringify({
      state: { inviteToken: "expired-invite-token" },
      version: 0,
    }));
  });

  await page.goto("/login?invitation=ready&token=expired-invite-token&returnTo=%2Flease%2Finitialize");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("invitation-ready")).toHaveCount(0);
  await expect(page.getByText("This invitation has expired or is no longer available.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
  await expect(page.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/role");
  const storedInvite = await page.evaluate(() => JSON.parse(localStorage.getItem("auth-storage") || "{}").state?.inviteToken);
  expect(storedInvite).toBeNull();
});

test("a valid invitation alone enables the guided login state", async ({ page }) => {
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/invite/inspect**", route => route.fulfill({ json: {
    success: true, code: "S00127", description: "Link is valid.",
    data: [{ type: "TENANT", expiresAt: "2026-10-01T00:00:00", validForSeconds: 86400 }],
  } }));

  await page.goto("/login?invitation=ready&token=valid-invite-token&returnTo=%2Flease%2Finitialize");

  await expect(page.getByTestId("invitation-ready")).toContainText("Sign in with the invited email");
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
    "href",
    /\/forgot-password\?.*token=valid-invite-token.*returnTo=%2Flease%2Finitialize/,
  );
  await expect(page.getByRole("link", { name: "Sign up" })).toHaveAttribute(
    "href",
    /\/register\?.*token=valid-invite-token.*returnTo=%2Flease%2Finitialize/,
  );
});

test("an invitation that expires during sign-in is cleared immediately", async ({ page }) => {
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/invite/inspect**", route => route.fulfill({ json: {
    success: true, code: "S00127", description: "Link is valid.",
    data: [{ type: "TENANT", expiresAt: "2026-10-01T00:00:00", validForSeconds: 86400 }],
  } }));
  await page.route("**/auth/login", route => route.fulfill({
    status: 409,
    contentType: "application/json",
    body: JSON.stringify({ success: false, code: "S00128", description: "Link has expired or is invalid.", data: [] }),
  }));

  await page.goto("/login?invitation=ready&token=just-expired-token&returnTo=%2Flease%2Finitialize");
  await expect(page.getByTestId("invitation-ready")).toBeVisible();
  await page.getByPlaceholder("you@example.com").fill("tenant@example.test");
  await page.getByPlaceholder("••••••••").fill("ValidPass1!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByTestId("invitation-ready")).toHaveCount(0);
  await expect(page.getByText("This invitation has expired or is no longer available.", { exact: false })).toBeVisible();
  const storedInvite = await page.evaluate(() => JSON.parse(localStorage.getItem("auth-storage") || "{}").state?.inviteToken);
  expect(storedInvite).toBeNull();
});

test("a new tenant can start registration directly from the unit invitation", async ({ page }) => {
  await page.route("https://accounts.google.com/**", route => route.abort());
  await page.route("**/invite/validate**", route => route.fulfill({ json: {
    success: true, code: "S0058", description: "Tenant invite",
    data: { unit: { propertyId: 11, unitId: 77, ref: "A-101", propertyType: "APARTMENT", unitType: "APARTMENT", size: 85,
      measurementUnits: { id: 1, name: "sqm" }, utilities: [], leaseMode: "RENT", price: 25000, currency: "KES",
      occupied: false, advertise: false, thumbnail: "", images: [], templateId: 9 },
      leaseStartDate: "2026-10-01", leaseEndDate: "2027-09-30" },
  } }));
  await page.route("**/property/type", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/property/unit/type**", route => route.fulfill({ json: envelope([]) }));
  await page.route("**/property/unit/charges**", route => route.fulfill({ json: envelope([]) }));

  await page.goto("/lease/onboard?token=tenant-new-account-token");
  await page.getByRole("button", { name: "Create tenant account" }).click();

  await expect(page).toHaveURL(/\/register\?.*token=tenant-new-account-token.*returnTo=%2Flease%2Finitialize/);
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/login\?.*token=tenant-new-account-token.*returnTo=%2Flease%2Finitialize/);
});

test("tenant initializes the landlord-defined lease without editing dates", async ({ context, page }) => {
  await authenticated(
    context,
    page,
    {title:"Tenant",permissions:["create_new_lease","view_lease_document"]},
    {inviteToken:"multi-unit-tenant-token"},
  );
  await page.route("**/invite/validate**",route=>route.fulfill({json:{
    success:true,code:"S0058",description:"Tenant invite",data:[{
      unit:{propertyId:11,unitId:77,ref:"A-101",propertyType:"APARTMENT",unitType:"APARTMENT",size:85,
        measurementUnits:{id:1,name:"sqm"},utilities:[],leaseMode:"RENT",price:25000,currency:"KES",
        occupied:false,advertise:false,thumbnail:"",images:[],templateId:9},
      leaseStartDate:"2026-10-01",leaseEndDate:"2027-09-30",
    }],
  }}));
  await page.route("**/property/type",route=>route.fulfill({json:envelope([])}));
  await page.route("**/property/unit/type**",route=>route.fulfill({json:envelope([])}));
  await page.route("**/property/unit/charges?**",route=>route.fulfill({json:envelope([])}));
  let payload:unknown;
  await page.route("**/lease/tenant/create",route=>{
    payload=route.request().postDataJSON();
    return route.fulfill({json:{success:true,code:"S0162",description:"Lease initialized",data:[{
      leaseId:501,agreementDocumentId:601,leaseStartDate:"2026-10-01",leaseEndDate:"2027-09-30",agreementStatus:"ISSUED",
    }]}});
  });
  await page.route("**/lease/documents**",route=>route.fulfill({json:{...envelope([]),totalPages:1}}));
  await page.route("**/lease/list**",route=>route.fulfill({json:envelope([])}));

  await page.goto("/lease/initialize?token=multi-unit-tenant-token");
  await expect(page.getByText("Oct 1, 2026").first()).toBeVisible();
  await expect(page.getByText("Sep 30, 2027").first()).toBeVisible();
  await page.getByRole("button",{name:"Initialize Lease"}).first().click();
  await page.getByRole("button",{name:"Initialize Lease"}).last().click();
  await expect.poll(()=>payload).toEqual({token:"multi-unit-tenant-token"});
  await expect(page).toHaveURL(/\/dashboard\/documents\?leaseId=501/);
});

test("tenant email verification continues to KYC before lease initialization", async ({ page }) => {
  const jwt = testToken([{ title: "Tenant", permissions: ["create_new_lease"] }]);
  await page.addInitScript(() => {
    localStorage.setItem("auth-storage", JSON.stringify({ state: {
      email: "tenant@example.test", step: "verify", inviteToken: "tenant-otp-token",
      roles: [], roleName: [], permissions: [], propertyIds: [], propertyNames: [], activeRole: null,
    }, version: 0 }));
  });
  let otpPayload: Record<string, unknown> | undefined;
  await page.route("**/otp/verify", route => {
    otpPayload = route.request().postDataJSON();
    return route.fulfill({ json: envelope([{
      jwt, refreshToken: "tenant-refresh-token-long-enough",
    }]) });
  });
  await page.route("**/kyc/current", route => route.fulfill({ json: envelope([{
    status: "NOT_STARTED", accountStatus: "PENDING_KYC", consentVersion: "2026-08",
    phoneVerified: false, requirements: [], missingRequirements: [], documents: [],
  }]) }));

  await page.goto("/verify-code?token=tenant-otp-token&returnTo=%2Flease%2Finitialize");
  await page.getByRole("textbox").fill("123456");
  await page.getByRole("button", { name: "Verify Email" }).click();

  expect(otpPayload).toMatchObject({ token: "tenant-otp-token" });
  await expect(page).toHaveURL(/\/kyc\?.*token=tenant-otp-token.*returnTo=%2Flease%2Finitialize/, { timeout: 8_000 });
});

test("an invalid chunked access cookie is fully cleared at the request boundary", async ({ page, context }) => {
  await context.addCookies([
    { name: "tokenChunks", value: "2", url: "http://127.0.0.1:3000" },
    { name: "token.0", value: "not-a-jwt", url: "http://127.0.0.1:3000" },
    { name: "token.1", value: "stale", url: "http://127.0.0.1:3000" },
  ]);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?reason=session-ended$/);

  const cookies = await context.cookies();
  expect(cookies.some(cookie =>
    cookie.name === "token" || cookie.name === "tokenChunks" || /^token\.\d+$/.test(cookie.name),
  )).toBe(false);
});

test("a valid-looking stale cookie cannot make the sign-in page unreachable", async ({ page, context }) => {
  const stale = testToken([{ title: "Landlord", permissions: [] }]);
  await context.addCookies([{ name: "token", value: stale, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.route("https://accounts.google.com/**", route => route.abort());

  await page.goto("/login");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
});

test("the browser session endpoint rejects malformed tokens", async ({ request }) => {
  const response = await request.post("/browser-session/set-cookie", {
    data: { token: "not-a-jwt", refreshToken: "long-but-invalid-refresh-token" },
  });
  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ success: false });
});

test("a large multi-role token survives the secure cookie handoff", async ({ page, context }) => {
  const permissions = Array.from({ length: 35 }, (_, index) => `permission_${index}_${"x".repeat(20)}`);
  const jwt = testToken([
    { title: "Landlord", permissions },
    { title: "EstateManager", permissions },
    { title: "SalesAgent", permissions },
  ]);
  expect(jwt.length).toBeGreaterThan(4_096);

  const response = await page.request.post("/browser-session/set-cookie", {
    data: { token: jwt, refreshToken: "refresh-token-longer-than-sixteen-characters" },
  });
  expect(response.status()).toBe(200);

  const cookies = await context.cookies();
  expect(cookies.find(cookie => cookie.name === "token")).toBeUndefined();
  expect(cookies.find(cookie => cookie.name === "tokenChunks")?.httpOnly).toBe(true);
  const tokenChunks = cookies.filter(cookie => /^token\.\d+$/.test(cookie.name));
  expect(tokenChunks.length).toBeGreaterThan(1);
  expect(tokenChunks.every(cookie => cookie.value.length <= 3_500 && cookie.httpOnly)).toBe(true);

  // The production cookie is Secure. Re-add the captured values without Secure so
  // Playwright's HTTP-only local web server can exercise reconstruction and Proxy.
  await context.clearCookies();
  await context.addCookies(cookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    httpOnly: cookie.httpOnly,
    secure: false,
    sameSite: cookie.sameSite,
  })));

  const retrieved = await page.request.get("/browser-session/get-token");
  expect(retrieved.status()).toBe(200);
  await expect(retrieved.json()).resolves.toMatchObject({ data: { jwt } });

  const protectedPage = await page.request.get("/continue-setup", { maxRedirects: 0 });
  expect(protectedPage.status()).toBe(200);

  await page.request.post("/browser-session/clear-cookie");
  const cleared = await context.cookies();
  expect(cleared.some(cookie => cookie.name === "token" || cookie.name === "tokenChunks" || /^token\.\d+$/.test(cookie.name))).toBe(false);
});

test("password reset verifies ownership and enforces the registration password policy", async ({ page }) => {
  await page.route("**/otp/options**", route => route.fulfill({ json: envelope([{ email: true, phone: false, google: false, preferred: "EMAIL" }]) }));
  await page.route("**/otp/send**", route => route.fulfill({ json: envelope(["sent"]) }));
  let resetPayload: Record<string, unknown> | undefined;
  await page.route("**/otp/verify", route => {
    resetPayload = route.request().postDataJSON();
    return route.fulfill({ json: envelope([{ jwt: testToken([{ title: "Landlord", permissions: [] }]), refreshToken: "reset-refresh" }]) });
  });
  await page.route("**/browser-session/set-cookie", route => route.fulfill({ json: { success: true } }));

  await page.goto("/forgot-password");
  await page.getByPlaceholder("you@example.com").fill("owner@example.test");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Email Verification/ }).click();
  await expect(page.getByRole("heading", { name: "Enter Verification Code" })).toBeVisible();
  await page.locator("input").fill("A1B2C3");
  await page.getByRole("button", { name: "Continue" }).click();

  const passwordFields = page.getByPlaceholder("••••••••");
  await passwordFields.nth(0).fill("alllowercase1");
  await passwordFields.nth(1).fill("alllowercase1");
  await page.getByRole("button", { name: "Reset Password" }).click();
  await expect(page.getByText("Include an uppercase letter")).toBeVisible();
  expect(resetPayload).toBeUndefined();

  await passwordFields.nth(0).fill("StrongPass1!");
  await passwordFields.nth(1).fill("StrongPass1!");
  await page.getByRole("button", { name: "Reset Password" }).click();
  await expect.poll(() => resetPayload).toBeTruthy();
  expect(resetPayload).toMatchObject({ code: "A1B2C3", email: "owner@example.test", channel: "EMAIL", password: "StrongPass1!" });
});
