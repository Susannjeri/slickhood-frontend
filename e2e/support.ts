import { BrowserContext, Page } from "@playwright/test";

export interface TestRole {
  title: string;
  permissions: string[];
  propertyIds?: number[];
  propertyNames?: string[];
  properties?: { id: number; name: string }[];
}

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

const normalizedRole = (role: TestRole): TestRole => ({
  ...role,
  properties: role.properties ?? (role.propertyIds ?? []).map((id, index) => ({
    id, name: role.propertyNames?.[index] ?? `Property #${id}`,
  })),
});

export const testToken = (roles: TestRole[]) => `${encode({ alg: "none", typ: "JWT" })}.${encode({
  sub: "slickhood-e2e-user",
  iss: "slickhood-e2e",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  roles: roles.map(normalizedRole),
})}.test-signature`;

export async function authenticated(context: BrowserContext, page: Page, role: TestRole) {
  const persisted = normalizedRole(role);
  const token = testToken([persisted]);
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
        propertyIds: persistedRole.propertyIds ?? [],
        propertyNames: persistedRole.propertyNames ?? [],
        activeRole: persistedRole,
      },
      version: 0,
    }));
  }, { persistedRole: persisted });
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
