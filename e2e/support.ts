import { BrowserContext, Page } from "@playwright/test";

export interface TestRole { title: string; permissions: string[] }

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

export const testToken = (roles: TestRole[]) => `${encode({ alg: "none", typ: "JWT" })}.${encode({
  sub: "slickhood-e2e-user",
  iss: "slickhood-e2e",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  roles,
})}.test-signature`;

export async function authenticated(context: BrowserContext, page: Page, role: TestRole) {
  const token = testToken([role]);
  await context.addCookies([{ name: "token", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.addInitScript(({ persistedRole }) => {
    localStorage.setItem("auth-storage", JSON.stringify({
      state: {
        mfaEnabled: false,
        totpEnabled: false,
        email: "e2e@slickhood.test",
        step: "complete",
        roles: [persistedRole],
        roleName: [persistedRole.title],
        permissions: persistedRole.permissions,
        propertyIds: [],
        propertyNames: [],
        activeRole: persistedRole,
      },
      version: 0,
    }));
  }, { persistedRole: role });
  await page.route("**/kyc/current", route => route.fulfill({ json: {
    success: true,
    code: "KYC_DETAILS",
    description: "Success",
    data: [{
      id: 1,
      status: "APPROVED",
      accountStatus: "ACTIVE",
      consentVersion: "2026-08",
      phoneVerified: true,
      requirements: [],
      missingRequirements: [],
      documents: [],
    }],
  } }));
  return token;
}

export const envelope = (data: unknown) => ({ success: true, code: "s00000", description: "Success", data });
