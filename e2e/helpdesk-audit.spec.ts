import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

function conversation(status = "ESCALATED") {
  return { id: 91, ticketNumber: "SH-AUDIT-91", subject: "Registration assistance", category: "REGISTRATION", status,
    priority: "NORMAL", activeRole: "Tenant", lastMessageAt: "2026-09-07T10:00:00", customerUnreadCount: 0, agentUnreadCount: 1,
    messages: [{ id: 1, senderType: "USER", content: "How do I continue?", createdOn: "2026-09-07T10:00:00Z", internalNote: false }] };
}

test("support can claim a case and failed resolve leaves it available for retry", async ({ context, page }) => {
  await authenticated(context, page, { title: "Support", permissions: ["view_helpdesk_queue", "manage_helpdesk_cases"] });
  const c = conversation(); let claims = 0;
  await page.route("**/helpdesk/articles", r => r.fulfill({ json: envelope([]) }));
  await page.route("**/helpdesk/conversations?**", r => r.fulfill({ json: envelope([]) }));
  await page.route("**/helpdesk/admin/conversations?**", r => r.fulfill({ json: { ...envelope([c]), totalPages: 2 } }));
  await page.route("**/helpdesk/admin/summary", r => r.fulfill({ json: envelope({ waitingForSupport: 1, unassigned: 1, slaBreached: 0, waitingForCustomer: 0 }) }));
  await page.route("**/helpdesk/admin/conversations/91", r => r.fulfill({ json: envelope([c]) }));
  await page.route("**/helpdesk/admin/conversations/91/claim", r => { claims++; c.status = "ASSIGNED"; return r.fulfill({ json: envelope([c]) }); });
  await page.route("**/helpdesk/admin/conversations/91/resolve", r => r.fulfill({ status: 503 }));
  await page.goto("/dashboard/helpdesk");
  await page.getByRole("button", { name: "Support queue", exact: true }).click();
  await page.getByRole("button", { name: "Claim case", exact: true }).click();
  expect(claims).toBe(1);
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(page.getByText("The case was not updated. Please retry.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resolve", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Next cases" }).click();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Knowledge", exact: true }).click();
  await expect(page.getByRole("button", { name: "Import user manual drafts" })).toHaveCount(0);
});

test("customer can reopen a resolved case", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: [] });
  const c = conversation("RESOLVED");
  await page.route("**/helpdesk/articles", r => r.fulfill({ json: envelope([]) }));
  await page.route("**/helpdesk/conversations?**", r => r.fulfill({ json: envelope([c]) }));
  await page.route("**/helpdesk/conversations/91", r => r.fulfill({ json: envelope([c]) }));
  await page.route("**/helpdesk/conversations/91/reopen", r => { c.status = "WAITING_FOR_SUPPORT"; return r.fulfill({ json: envelope(c) }); });
  await page.goto("/dashboard/helpdesk");
  await page.getByRole("button", { name: "Reopen case" }).click();
  await expect(page.getByText("waiting for support", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Support queue", exact: true })).toHaveCount(0);
});

test("superadmin imports manual drafts without silently publishing", async ({ context, page }) => {
  await authenticated(context, page, { title: "Superadmin", permissions: ["manage_helpdesk_articles"] });
  await page.route("**/helpdesk/articles", r => r.fulfill({ json: envelope([]) }));
  await page.route("**/helpdesk/conversations?**", r => r.fulfill({ json: envelope([]) }));
  const articles: object[] = [];
  await page.route("**/helpdesk/admin/articles", r => r.fulfill({ json: envelope(articles) }));
  await page.route("**/helpdesk/admin/articles/manual-drafts", r => {
    articles.push({ id: 1, slug: "manual-start", title: "Getting started manual", category: "Getting started", body: "Review the active workspace.", published: false });
    return r.fulfill({ json: envelope({ created: 1, retained: 0 }) });
  });
  await page.goto("/dashboard/helpdesk");
  await page.getByRole("button", { name: "Knowledge", exact: true }).click();
  await page.getByRole("button", { name: "Import user manual drafts" }).click();
  await expect(page.getByText("Getting started manual", { exact: true })).toBeVisible();
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await expect(page.getByText(/1 manual drafts added/)).toBeVisible();
});

test("guest can request a human before asking the AI", async ({ page }) => {
  const c = conversation(); let sends = 0;
  await page.route("**/helpdesk/public/conversations", r => r.fulfill({ json: envelope([{ conversation: c, accessToken: "synthetic-guest-token-more-than-32-characters", expiresAt: "2099-01-01T00:00:00" }]) }));
  await page.route("**/helpdesk/public/conversations/SH-AUDIT-91/escalate", r => r.fulfill({ json: envelope([c]) }));
  await page.route("**/helpdesk/public/conversations/SH-AUDIT-91/messages", r => { sends++; return r.fulfill({ status: 500 }); });
  await page.goto("/register");
  await page.getByRole("button", { name: "Open Slickhood Help" }).click();
  await page.getByRole("button", { name: "Talk to a person" }).click();
  await expect(page.getByText(/SH-AUDIT-91/)).toBeVisible();
  expect(sends).toBe(0);
});

test("customer can read the cited article without administrative access", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: [] });
  const c = { ...conversation("OPEN"), messages: [{ id: 2, senderType: "AI", content: "Open Billing. [Article 6]",
    sourceArticleIds: "6", createdOn: "2026-09-15T10:00:00Z", internalNote: false }] };
  let administrativeRequests = 0;
  await page.route("**/helpdesk/admin/**", r => { administrativeRequests++; return r.fulfill({ status: 403 }); });
  await page.route("**/helpdesk/articles", r => r.fulfill({ json: envelope([{ id: 6, title: "Finding receipts", category: "Billing", published: true,
    body: "Published receipt guidance for the current profile." }]) }));
  await page.route("**/helpdesk/conversations?**", r => r.fulfill({ json: envelope([c]) }));
  await page.route("**/helpdesk/conversations/91", r => r.fulfill({ json: envelope([c]) }));
  await page.goto("/dashboard/helpdesk");
  await page.getByRole("button", { name: "Read article 6", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Finding receipts" })).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Published receipt guidance for the current profile.", { exact: true })).toBeVisible();
  expect(administrativeRequests).toBe(0);
});

test("withdrawn cited guidance is explained rather than reused", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: [] });
  const c = { ...conversation("OPEN"), messages: [{ id: 2, senderType: "AI", content: "Old answer. [Article 6]",
    sourceArticleIds: "6", createdOn: "2026-09-15T10:00:00Z", internalNote: false }] };
  await page.route("**/helpdesk/articles", r => r.fulfill({ json: envelope([]) }));
  await page.route("**/helpdesk/conversations?**", r => r.fulfill({ json: envelope([c]) }));
  await page.route("**/helpdesk/conversations/91", r => r.fulfill({ json: envelope([c]) }));
  await page.goto("/dashboard/helpdesk");
  await page.getByRole("button", { name: "Read article 6", exact: true }).click();
  await expect(page.getByRole("dialog").getByText(/no longer published or available/)).toBeVisible();
});

test("mobile guest can open published answer sources", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const c = { ...conversation("OPEN"), messages: [{ id: 2, senderType: "AI", content: "Register your account. [Article 6]",
    sourceArticleIds: "6", createdOn: "2026-09-15T10:00:00Z", internalNote: false }] };
  await page.route("**/helpdesk/public/conversations", r => r.fulfill({ json: envelope([{ conversation: c,
    accessToken: "synthetic-guest-token-more-than-32-characters", expiresAt: "2099-01-01T00:00:00" }]) }));
  await page.route("**/helpdesk/public/conversations/SH-AUDIT-91/escalate", r => r.fulfill({ json: envelope([c]) }));
  await page.route("**/helpdesk/public/conversations/SH-AUDIT-91", r => r.fulfill({ json: envelope([c]) }));
  await page.route("**/helpdesk/public/articles", r => r.fulfill({ json: envelope([{ id: 6, title: "Registration guide", published: true,
    body: "Public registration instructions.", category: "Registration" }]) }));
  await page.goto("/register");
  await page.getByRole("button", { name: "Open Slickhood Help" }).click();
  await page.getByRole("button", { name: "Talk to a person" }).click();
  await page.getByRole("button", { name: "Read article 6", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: "Registration guide" })).toBeVisible();
  const box = await page.getByRole("dialog").boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
  await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Read article 6", exact: true })).toBeVisible();
});
