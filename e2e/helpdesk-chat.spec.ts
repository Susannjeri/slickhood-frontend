import { expect, test } from "@playwright/test";
import { envelope } from "./support";

test("registration help opens a guest chat and can transfer to human support", async ({ page }) => {
  const conversation = {
    id: 71, ticketNumber: "SH-260901-ABC12345", subject: "How do I complete registration?",
    category: "REGISTRATION", pageContext: "/register", status: "OPEN", priority: "NORMAL",
    activeRole: "Registration guest", lastMessageAt: "2026-09-01T17:00:00", customerUnreadCount: 0,
    agentUnreadCount: 0, messages: [] as Array<Record<string, unknown>>,
  };

  await page.route("**/helpdesk/public/conversations", async (route) => {
    await route.fulfill({ json: envelope([{ conversation, accessToken: "guest-token-with-more-than-thirty-two-characters", expiresAt: "2026-09-02T17:00:00" }]) });
  });
  await page.route("**/helpdesk/public/conversations/SH-260901-ABC12345/messages", async (route) => {
    expect(route.request().headers()["x-help-token"]).toBe("guest-token-with-more-than-thirty-two-characters");
    conversation.messages = [
      { id: 1, senderType: "USER", content: "How do I complete registration?", createdOn: "2026-09-01T17:00:01Z", internalNote: false },
      { id: 2, senderType: "AI", content: "Enter your details, verify your code, then choose the role you want to use.", createdOn: "2026-09-01T17:00:02Z", internalNote: false },
    ];
    await route.fulfill({ json: envelope([conversation]) });
  });
  await page.route("**/helpdesk/public/conversations/SH-260901-ABC12345/escalate", async (route) => {
    expect(route.request().headers()["x-help-token"]).toBe("guest-token-with-more-than-thirty-two-characters");
    conversation.status = "ESCALATED";
    conversation.messages.push({ id: 3, senderType: "SYSTEM", content: "This conversation has been transferred to a human support specialist.", createdOn: "2026-09-01T17:00:03Z", internalNote: false });
    await route.fulfill({ json: envelope([conversation]) });
  });

  await page.goto("/register");
  await page.getByRole("button", { name: "Open Slickhood Help" }).click();
  await expect(page.getByText("How can I help with registration?")).toBeVisible();
  await page.getByRole("button", { name: "How do I complete registration?" }).click();
  await expect(page.getByText("Enter your details, verify your code, then choose the role you want to use.")).toBeVisible();
  await page.getByRole("button", { name: "Talk to a person" }).click();
  await expect(page.getByText("This conversation has been transferred to a human support specialist.")).toBeVisible();
  await expect(page.getByText(/waiting for support/i)).toBeVisible();
});
