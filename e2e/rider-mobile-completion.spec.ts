import {expect,test} from "@playwright/test";
import {authenticated,envelope} from "./support";

test("merchant dispatch lists only verified registered available riders and uses Nairobi time",async({context,page})=>{
 await authenticated(context,page,{title:"ServiceProvider",permissions:[]});
 await page.route("**/soko/catalog**",r=>r.fulfill({json:envelope([])}));
 await page.route("**/soko/store/my",r=>r.fulfill({json:envelope([{id:2,name:"Fresh Corner",status:"PUBLISHED"}])}));
 await page.route("**/account/list**",r=>r.fulfill({json:envelope([])}));
 await page.route("**/soko/product/my**",r=>r.fulfill({json:envelope([])}));
 await page.route("**/soko/order/merchant**",r=>r.fulfill({json:envelope([{order:{id:7,storeId:2,orderNumber:"SOKO-READY",status:"PACKED",paymentStatus:"PAID",deliveryMethod:"DELIVERY",total:100,currency:"KES"},storeName:"Fresh Corner",items:[]}])}));
 const ready={id:9,storeId:2,userId:12,displayName:"Verified Rider",verified:true,status:"ACTIVE",availability:"AVAILABLE",phoneNumber:"0700000000",riderType:"INDIVIDUAL",vehicleType:"MOTORBIKE"};
 await page.route("**/soko/rider/my**",r=>r.fulfill({json:envelope([ready,{...ready,id:10,displayName:"Unregistered",userId:null},{...ready,id:11,displayName:"Unverified",verified:false},{...ready,id:12,displayName:"Busy Rider",availability:"BUSY"}])}));
 await page.goto("/dashboard/soko");await page.getByRole("button",{name:"Merchant workspace"}).click();await page.getByRole("button",{name:"Dispatch",exact:true}).click();
 await expect(page.getByLabel("Verified rider")).toHaveValue("9");await expect(page.getByLabel("Verified rider").locator("option")).toHaveText(["Verified Rider"]);
 await expect(page.getByText("One-off courier",{exact:false})).toHaveCount(0);
 const eta=page.getByLabel("Expected arrival (Nairobi)");
 const actual=await eta.inputValue();const nairobiHour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Nairobi",hour:"2-digit",hourCycle:"h23"}).format(new Date(Date.now()+4*3600000)));
 expect(Number(actual.slice(11,13))).toBe(nairobiHour);await expect(page.getByRole("button",{name:"Dispatch order",exact:true})).toBeEnabled();
});

test("phone delivery workflow uses camera input and an in-page failure form",async({context,page})=>{
 await page.setViewportSize({width:390,height:844});await authenticated(context,page,{title:"ServiceProvider",permissions:[]});
 let failed=false;
 await page.route("**/soko/rider/assignments?**",route=>route.fulfill({json:envelope([{order:{id:7,orderNumber:"SOKO-MOBILE",status:failed?"DELIVERY_FAILED":"DISPATCHED",customerPhone:"+254700000000",deliveryAddress:"Jabali Towers",deliveryMethod:"DELIVERY"},storeName:"Fresh Corner",items:[]}])}));
 await page.route("**/soko/order/7/rider/fail",route=>{expect(route.request().postDataJSON()).toEqual({reason:"Buyer unavailable"});failed=true;return route.fulfill({json:envelope([])});});
 await page.goto("/dashboard/soko-deliveries");
 await expect(page.getByText("SOKO-MOBILE",{exact:true})).toBeVisible();await expect(page.locator('input[type="file"]')).toHaveAttribute("capture","environment");
 await page.getByRole("button",{name:"Record failed attempt",exact:true}).click();await page.getByLabel("Failed delivery reason").fill("Buyer unavailable");await page.getByRole("button",{name:"Save reason",exact:true}).click();
 await expect(page.getByRole("button",{name:"Record return",exact:true})).toBeVisible();expect(failed).toBe(true);
 await expect(page.locator('a[href^="https://wa.me/"]')).toHaveCount(0);
});
