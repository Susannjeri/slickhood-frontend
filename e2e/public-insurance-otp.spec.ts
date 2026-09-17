import {expect,test} from "@playwright/test";
import {envelope} from "./support";

test("public insurance verification reports delivery and supports an SMS fallback",async({page})=>{
 const requested:Record<string,unknown>[]=[];
 const resendAt=new Date(Date.now()-1_000).toISOString();
 await page.route("**/public/insurance/agency",r=>r.fulfill({json:envelope({code:"SILVERWOOD",name:"Silverwood Insurance Agency"})}));
 await page.route("**/public/insurance/products",r=>r.fulfill({json:envelope([{code:"MOTOR",name:"Motor Insurance",description:"Motor cover",subjectTypes:["VEHICLE"]}])}));
 await page.route("**/public/insurance/companies",r=>r.fulfill({json:envelope([])}));
 await page.route("**/public/insurance/access/channels",r=>r.fulfill({json:envelope({email:true,sms:true})}));
 await page.route("**/public/insurance/access/request",async r=>{
  requested.push(r.request().postDataJSON());
  return r.fulfill({json:envelope({challengeId:"guest-challenge",message:"Queued",deliveryChannel:"EMAIL",maskedDestination:"s***@example.com",deliveryStatus:"QUEUED",resendAvailableAt:resendAt})});
 });
 await page.route("**/public/insurance/access/status",r=>r.fulfill({json:envelope({deliveryChannel:"EMAIL",maskedDestination:"s***@example.com",deliveryStatus:"FAILED",resendAvailableAt:resendAt})}));
 await page.route("**/public/insurance/access/resend",async r=>{
  requested.push(r.request().postDataJSON());
  return r.fulfill({json:envelope({challengeId:"guest-challenge",message:"Queued",deliveryChannel:"SMS",maskedDestination:"+*** *** *** 650",deliveryStatus:"DELIVERED",resendAvailableAt:new Date(Date.now()+60_000).toISOString()})});
 });
 await page.route("**/public/insurance/access/verify",r=>r.fulfill({json:envelope({accessToken:"guest-access-token-long-enough-for-test",expiresAt:"2026-10-17T10:00:00"})}));
 await page.route("**/public/insurance/case",r=>r.fulfill({json:envelope({insuranceCase:null,accountRequiredForPayment:true})}));

 await page.goto("/insurance");
 await expect(page).toHaveTitle("Silverwood Insurance Agency | Request a Quote");
 await expect(page.getByRole("heading",{name:"Request insurance cover online."})).toBeVisible();
 await expect(page.getByText("SlickHood",{exact:false})).toHaveCount(0);
 await page.getByLabel("Full name").fill("Susan Wanjohi");
 await page.getByRole("textbox",{name:"Email"}).fill("susan@example.com");
 await page.getByLabel("Phone number").fill("0722788650");
 await page.getByLabel("Email",{exact:true}).last().check();
 await page.getByRole("button",{name:"Send verification code"}).click();
 await expect(page.getByText("Sending code",{exact:true})).toBeVisible();
 await expect.poll(()=>requested[0]?.deliveryChannel).toBe("EMAIL");
 await expect(page.getByText("Delivery failed",{exact:true})).toBeVisible({timeout:10_000});
 await page.getByRole("button",{name:"Resend by SMS"}).click();
 await expect.poll(()=>requested[1]?.deliveryChannel).toBe("SMS");
 await expect(page.getByText("Code sent",{exact:true})).toBeVisible();
 await page.getByLabel("Six-digit code").fill("123456");
 await page.getByRole("button",{name:"Verify code"}).click();
 await expect(page.getByRole("heading",{name:"What would you like to insure?"})).toBeVisible();
});
