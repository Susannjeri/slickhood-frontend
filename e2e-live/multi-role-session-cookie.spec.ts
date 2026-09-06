import { expect, test } from "@playwright/test";

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

test("production preserves a large multi-role access token across the secure session handoff", async ({ page, context }) => {
  const permissions = Array.from({ length: 35 }, (_, index) => `permission_${index}_${"x".repeat(20)}`);
  const token = `${encode({ alg: "none" })}.${encode({
    sub: "production-session-smoke",
    exp: Math.floor(Date.now() / 1_000) + 300,
    roles: [
      { title: "Landlord", permissions },
      { title: "EstateManager", permissions },
      { title: "SalesAgent", permissions },
    ],
  })}.synthetic`;
  expect(token.length).toBeGreaterThan(4_096);

  const setResponse = await page.request.post("/browser-session/set-cookie", {
    data: { token, refreshToken: "production-session-smoke-refresh-token" },
  });
  expect(setResponse.status()).toBe(200);

  const cookies = await context.cookies();
  expect(cookies.find(cookie => cookie.name === "token")).toBeUndefined();
  expect(cookies.find(cookie => cookie.name === "tokenChunks")?.secure).toBe(true);
  expect(cookies.filter(cookie => /^token\.\d+$/.test(cookie.name)).length).toBeGreaterThan(1);

  const getResponse = await page.request.get("/browser-session/get-token");
  expect(getResponse.status()).toBe(200);
  await expect(getResponse.json()).resolves.toMatchObject({ data: { jwt: token } });

  const clearResponse = await page.request.post("/browser-session/clear-cookie");
  expect(clearResponse.status()).toBe(200);
});
