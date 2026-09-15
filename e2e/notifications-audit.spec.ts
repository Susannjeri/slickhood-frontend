import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("expired and cancelled invitations keep history without a review link",async({context,page})=>{
  await authenticated(context,page,{title:"Tenant",permissions:[]});
  await page.route("**/notification/mine?**",route=>route.fulfill({json:{...envelope([
    {id:51,channel:"IN_APP",notificationType:"INVITE_RECEIVED",message:"Old invite /lease/onboard?token=expired-token",actionStatus:"EXPIRED",delivered:true,read:false,createdOn:"2026-09-15T08:00:00+03:00"},
    {id:52,channel:"IN_APP",notificationType:"INVITE_RECEIVED",message:"Cancelled invite /lease/onboard?token=cancelled-token",actionStatus:"CANCELLED",delivered:true,read:false,createdOn:"2026-09-15T08:00:00+03:00"},
  ]),totalElements:2,totalPages:1}}));
  await page.goto("/dashboard/notifications");
  await expect(page.getByText("This invitation has expired. Ask the sender for a new invitation.")).toBeVisible();
  await expect(page.getByText("This invitation was cancelled.")).toBeVisible();
  await expect(page.getByRole("link",{name:"Review invitation"})).toHaveCount(0);
});

test("server-approved actions take precedence over old links in the message",async({context,page})=>{
  await authenticated(context,page,{title:"Tenant",permissions:[]});
  await page.route("**/notification/mine?**",route=>route.fulfill({json:{...envelope([
    {id:53,channel:"IN_APP",notificationType:"SOKO_ORDER_STATUS",message:"Old order link /dashboard/invoices",actionStatus:"AVAILABLE",actionPath:"/dashboard/soko",delivered:true,read:false,createdOn:"2026-09-15T08:00:00+03:00"},
  ]),totalElements:1,totalPages:1}}));
  await page.goto("/dashboard/notifications");
  await expect(page.getByRole("link",{name:"Review details"})).toHaveAttribute("href",/\/dashboard\/soko$/);
  await expect(page.getByText("Order update",{exact:true})).toBeVisible();
});

test("an external structured notification action is never clickable",async({context,page})=>{
  await authenticated(context,page,{title:"Tenant",permissions:[]});
  await page.route("**/notification/mine?**",route=>route.fulfill({json:{...envelope([
    {id:54,channel:"IN_APP",notificationType:"ORDER_UPDATE",message:"Check your order",actionStatus:"AVAILABLE",actionPath:"https://evil.example/collect",delivered:true,read:false,createdOn:"2026-09-15T08:00:00+03:00"},
  ]),totalElements:1,totalPages:1}}));
  await page.goto("/dashboard/notifications");await expect(page.getByText("Check your order",{exact:true})).toBeVisible();
  await expect(page.getByRole("link",{name:"Review details"})).toHaveCount(0);
});

test("unavailable unread counts are not labelled as zero and recover on focus", async ({context,page}) => {
  await authenticated(context,page,{title:"Tenant",permissions:[]});let failing=true;
  await page.route("**/notification/mine/unread-count",route=>route.fulfill(failing?{status:503,json:{description:"Unavailable"}}:{json:envelope([{count:4}])}));
  await page.goto("/dashboard");
  await expect(page.getByRole("link",{name:"Open alerts, unread count unavailable"})).toBeVisible();
  await expect(page.getByRole("link",{name:"Open alerts, no unread notifications"})).toHaveCount(0);
  failing=false;await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await expect(page.getByTestId("notification-unread-count")).toHaveText("4");
});

test("personal inbox refreshes on focus without losing pagination",async({context,page})=>{
  await authenticated(context,page,{title:"Tenant",permissions:[]});let version=1;
  await page.route("**/notification/mine?**",route=>{const number=new URL(route.request().url()).searchParams.get("page");return route.fulfill({json:{...envelope([{id:20,channel:"IN_APP",notificationType:"ORDER_UPDATE",message:`Page ${number} version ${version}`,delivered:true,read:false,createdOn:"2026-09-15T08:00:00+03:00"}]),totalElements:20,totalPages:2}});});
  await page.goto("/dashboard/notifications");await page.getByRole("button",{name:"Next",exact:true}).click();
  await expect(page.getByText("Page 1 version 1",{exact:true})).toBeVisible();
  version=2;await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Page 1 version 2",{exact:true})).toBeVisible();await expect(page.getByText("Page 2 of 2",{exact:true})).toBeVisible();
});

test("shared profile header alerts the signed-in user to unread notifications", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: [] });
  await page.route("**/notification/mine/unread-count", route => route.fulfill({ json: envelope([{ count: 3 }]) }));

  await page.goto("/dashboard");

  const alertLink = page.getByRole("link", { name: "Open alerts, 3 unread" });
  await expect(alertLink).toBeVisible();
  await expect(page.getByTestId("notification-unread-count")).toHaveText("3");
  await alertLink.click();
  await expect(page).toHaveURL(/\/dashboard\/notifications$/);
});

test("admin delivery records distinguish SMTP acceptance from unconfirmed delivery", async ({ context, page }) => {
  await authenticated(context, page, { title: "Superadmin", permissions: ["view_notifications"] });
  const common = { currency: "KES", description: null, createdOn: "2026-09-07T08:00:00+03:00", retry: true, status: null, recipient: "recipient@example.test", network: null, cost: 0, notificationType: "RENT_PAYMENT_REMINDER_EMAIL", retryCount: 0, callbackIP: null, lastUpdateOn: "2026-09-07T08:00:00+03:00" };
  await page.route("**/notification/list**", route => route.fulfill({ json: { ...envelope([
    { ...common, notificationId: 1, channel: "EMAIL", delivered: true },
    { ...common, notificationId: 2, channel: "SMS", delivered: false },
  ]), totalPages: 1, totalElements: 2 } }));
  await page.route("**/notification/mine?**", route => route.fulfill({ json: { ...envelope([]), totalPages: 0, totalElements: 0 } }));
  await page.goto("/dashboard/notifications");
  await page.getByRole("tab", { name: "Delivery monitor" }).click();
  await expect(page.getByText("Accepted by mail server", { exact: true })).toBeVisible();
  await expect(page.getByText("Delivery not confirmed", { exact: true })).toBeVisible();
  await expect(page.getByText("Failed", { exact: true })).toHaveCount(0);
});

test("operational users with delivery permission still open their own alerts first", async ({ context, page }) => {
  await authenticated(context, page, { title: "EstateManager", permissions: ["view_notifications"] });
  await page.route("**/notification/mine?**", route => route.fulfill({ json: { ...envelope([
    { id: 12, channel: "IN_APP", notificationType: "SERVICE_CHARGE_OVERDUE", message: "Service charge invoice INV-12 is overdue. Open /dashboard/invoices to review or pay it.", delivered: true, read: false, createdOn: "2026-09-14T08:00:00+03:00" },
  ]), totalElements: 1, totalPages: 1 } }));

  await page.goto("/dashboard/notifications");

  await expect(page.getByText("Estate charge overdue", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Delivery monitor" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Review billing" })).toBeVisible();
});

test("personal notifications distinguish email acceptance and render email markup as safe text", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_my_notifications"] });
  await page.route("**/notification/mine?**", route => route.fulfill({ json: { ...envelope([
    { id: 1, channel: "EMAIL", notificationType: "RENT_PAYMENT_REMINDER_EMAIL", message: "<p>Outstanding balance &amp; invoice</p>&lt;img src=x onerror=alert(1)&gt;", delivered: true, read: false, createdOn: "2026-09-07T08:00:00+03:00" },
    { id: 2, channel: "SMS", notificationType: "PAYMENT_SUCCESS_SMS", message: "Payment received", delivered: false, read: true, createdOn: "2026-09-07T08:00:00+03:00" },
  ]), totalElements: 2, totalPages: 1 } }));
  await page.route("**/notification/mine/1/read", route => route.fulfill({ json: envelope({}) }));
  await page.goto("/dashboard/notifications");
  await expect(page.getByText("Accepted by mail server", { exact: true })).toBeVisible();
  await expect(page.getByText("Delivery not confirmed", { exact: true })).toBeVisible();
  await expect(page.getByText(/Outstanding balance & invoice/)).toBeVisible();
  await expect(page.locator("article img")).toHaveCount(0);
  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(page.getByRole("button", { name: "Mark as read" })).toHaveCount(0);
});

test("notification fetch errors do not masquerade as an empty inbox", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_my_notifications"] });
  let failing = true;
  await page.route("**/notification/mine?**", route => route.fulfill(failing
    ? { status: 503, json: { message: "Notification service unavailable" } }
    : { json: { ...envelope([]), totalElements: 0, totalPages: 0 } }));
  await page.goto("/dashboard/notifications");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByText("You are all caught up")).toHaveCount(0);
  failing = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("You are all caught up")).toBeVisible();
});

test("existing-user invitation is an actionable in-app notification", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: [] });
  const inviteUrl = "http://127.0.0.1:3100/lease/onboard?token=existing-user-token";
  await page.route("**/notification/mine?**", route => route.fulfill({ json: { ...envelope([
    { id: 8, channel: "IN_APP", notificationType: "INVITE_RECEIVED", message: `You have a new tenant invitation. Review it securely: ${inviteUrl}`, delivered: true, read: false, createdOn: "2026-09-12T10:00:00+03:00" },
  ]), totalElements: 1, totalPages: 1 } }));
  await page.route("**/notification/mine/8/read", route => route.fulfill({ json: envelope({}) }));

  await page.goto("/dashboard/notifications");

  await expect(page.getByRole("link", { name: "Notifications", exact: true })).toBeVisible();
  await expect(page.getByText("Available in SlickHood", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Review invitation" })).toHaveAttribute("href", inviteUrl);
});

test("in-app notification never exposes an off-site action link", async ({ context, page }) => {
  await authenticated(context, page, { title: "Tenant", permissions: ["view_my_notifications"] });
  await page.route("**/notification/mine?**", route => route.fulfill({ json: { ...envelope([
    { id: 9, channel: "IN_APP", notificationType: "INVITE_RECEIVED", message: "Review it securely: https://attacker.example/collect", delivered: true, read: false, createdOn: "2026-09-12T10:00:00+03:00" },
  ]), totalElements: 1, totalPages: 1 } }));

  await page.goto("/dashboard/notifications");

  await expect(page.getByRole("link", { name: "Review invitation" })).toHaveCount(0);
});
