import { expect, test } from "@playwright/test";
import { authenticated, envelope } from "./support";

test("merchant can update an existing shop payment account and product stock",async({context,page})=>{
  await authenticated(context,page,{title:"ServiceProvider",permissions:[]});
  const shop={id:2,name:"Fresh Corner",description:"Local",status:"PUBLISHED",phoneNumber:"0700000000",address:"Nairobi",serviceRadiusKm:25,pickupEnabled:true,deliveryEnabled:true,deliveryFee:100,currency:"KES",paymentAccountId:9,latitude:-1.2,longitude:36.8};
  const product={id:5,storeId:2,name:"Milk",category:"Groceries",unit:"item",price:100,stockQuantity:3,currency:"KES",status:"PUBLISHED"};
  let shopSaved=false,stockSaved=false;
  await page.route("**/soko/catalog**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/store/my",r=>r.fulfill({json:envelope([shop])}));
  await page.route("**/account/list**",r=>r.fulfill({json:envelope([{id:9,name:"Merchant M-Pesa",verified:true,active:true,category:"MERCHANT",channel:"MPESA"}])}));
  await page.route("**/soko/product/my**",r=>r.fulfill({json:envelope([product])}));
  await page.route("**/soko/rider/my**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/order/merchant**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/store/2",r=>{const body=r.request().postDataJSON();expect(body.paymentAccountId).toBe(9);expect(body.latitude).toBe(-1.2);shopSaved=true;return r.fulfill({json:envelope([shop])});});
  await page.route("**/soko/product/5",r=>{const body=r.request().postDataJSON();expect(body.price).toBe(125.5);expect(body.stockQuantity).toBe(20);stockSaved=true;return r.fulfill({json:envelope([{...product,...body}])});});
  await page.goto("/dashboard/soko");await page.getByRole("button",{name:"Merchant workspace"}).click();
  await page.getByRole("button",{name:"Edit shop and payment account"}).click();
  await page.getByRole("button",{name:"Save shop changes"}).click();
  await expect.poll(()=>shopSaved).toBe(true);
  await page.getByRole("button",{name:"Edit price and stock"}).click();
  await page.getByLabel("Product price").fill("125.5");
  await page.getByLabel("Stock quantity",{exact:true}).fill("20");
  await page.getByRole("button",{name:"Save product changes"}).click();
  await expect.poll(()=>stockSaved).toBe(true);
});

test("one Marketplace menu contains Services and Soko without duplicate shopping links", async ({context,page}) => {
  await authenticated(context,page,{title:"Tenant",permissions:["view_sp_service"]});
  await page.route("**/sp/directory**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/sp/category/list**",r=>r.fulfill({json:envelope([])}));
  await page.goto("/dashboard/marketplace");
  await page.getByRole("button",{name:"Marketplace",exact:true}).click();
  await expect(page.getByRole("link",{name:"Services",exact:true})).toHaveCount(1);
  await expect(page.getByRole("link",{name:"Soko",exact:true})).toHaveCount(1);
  await expect(page.getByRole("button",{name:"Soko · Groceries Catalog"})).toHaveCount(0);
  await expect(page.getByRole("link",{name:"Soko Management",exact:true})).toHaveCount(0);
});

test("provider buying another service retains customer payment actions",async({context,page})=>{
  await authenticated(context,page,{title:"ServiceProvider",permissions:["view_sp_service","confirm_sp_booking","complete_sp_booking"]});
  await page.route("**/sp/directory**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/sp/category/list**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/sp/booking/my**",r=>r.fulfill({json:envelope([{
    id:70,serviceId:12,serviceName:"Cleaning",serviceProviderName:"Other Provider",bookedByUserName:"Customer",
    scheduledAt:new Date().toISOString(),status:"AWAITING_PAYMENT",customerBooking:true,
    invoiceRef:"INV-70",paymentAccountId:9,paymentChannel:"MPESA",paymentStatus:"UNPAID"
  }])}));
  await page.goto("/dashboard/marketplace");
  await page.getByRole("button",{name:"My bookings"}).click();
  await expect(page.getByRole("button",{name:"Pay now",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Accept & invoice"})).toHaveCount(0);
});

test("delivery code retry reuses saved proof and can finish successfully",async({context,page})=>{
  await authenticated(context,page,{title:"ServiceProvider",permissions:[]});
  let proofUploads=0,confirmations=0,completed=false;
  const order=()=>({order:{id:41,orderNumber:"SOKO-41",storeId:2,status:completed?"COMPLETED":"DISPATCHED",paymentStatus:"PAID",
    invoiceRef:"INV-41",deliveryMethod:"DELIVERY",customerPhone:"0700000000",subtotal:500,deliveryFee:100,total:600,currency:"KES",
    deliveryProofAt:proofUploads?new Date().toISOString():undefined},storeName:"Fresh Corner",items:[]});
  await page.route("**/soko/catalog**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/store/my",r=>r.fulfill({json:envelope([{id:2,name:"Fresh Corner",status:"PUBLISHED"}])}));
  await page.route("**/account/list**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/product/my**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/rider/my**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/order/merchant**",r=>r.fulfill({json:envelope([order()])}));
  await page.route("**/soko/order/41/delivery/proof",r=>{proofUploads++;return r.fulfill({json:envelope([order()])});});
  await page.route("**/soko/order/41/delivery/confirm",r=>{
    confirmations++;if(confirmations===1)return r.fulfill({status:400,json:{description:"Incorrect delivery code"}});
    completed=true;return r.fulfill({json:envelope([order()])});
  });
  await page.goto("/dashboard/soko");
  await page.getByRole("button",{name:"Merchant workspace"}).click();
  await page.getByRole("button",{name:"Complete delivery",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Complete delivery"});
  await dialog.getByLabel("Delivery proof photo").setInputFiles({name:"proof.png",mimeType:"image/png",buffer:Buffer.from("test-proof")});
  await dialog.getByLabel("6-digit confirmation code").fill("000000");
  await dialog.getByRole("button",{name:"Verify and complete"}).click();
  await expect(dialog.getByText("Delivery proof saved.",{exact:false})).toBeVisible();
  await dialog.getByLabel("6-digit confirmation code").fill("123456");
  await dialog.getByRole("button",{name:"Verify and complete"}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("COMPLETED",{exact:true})).toBeVisible();
  expect(proofUploads).toBe(1);expect(confirmations).toBe(2);
});

test("unpaid order can retry payment and cancel without creating another checkout",async({context,page})=>{
  await authenticated(context,page,{title:"Tenant",permissions:[]});
  let cancelled=false,payments=0;
  await page.route("**/soko/catalog**",r=>r.fulfill({json:envelope([])}));
  await page.route("**/soko/order/my**",r=>r.fulfill({json:envelope([{
    order:{id:42,orderNumber:"SOKO-42",status:cancelled?"CANCELLED":"PENDING_PAYMENT",paymentStatus:"UNPAID",
      invoiceRef:"INV-42",deliveryMethod:"PICKUP",customerPhone:"0700000000",total:500,currency:"KES"},
    storeName:"Fresh Corner",paymentAccountId:9,paymentChannel:"MPESA",items:[]
  }])}));
  await page.route("**/payment/init**",r=>{payments++;expect(r.request().url()).toContain("INV-42");return r.fulfill({json:envelope([])});});
  await page.route("**/soko/order/42/cancel",r=>{expect(r.request().postDataJSON().reason).toBe("Wrong quantity");cancelled=true;return r.fulfill({json:envelope([])});});
  await page.goto("/dashboard/soko");await page.getByRole("button",{name:"My orders"}).click();
  await page.getByRole("button",{name:"Pay now",exact:true}).click();
  await expect(page.getByRole("status").filter({hasText:"Payment requested"})).toBeVisible();
  await page.getByRole("button",{name:"Cancel order",exact:true}).click();
  await page.getByRole("dialog",{name:"Cancel order"}).getByLabel("Reason").fill("Wrong quantity");
  await page.getByRole("button",{name:"Confirm cancellation"}).click();
  await expect(page.getByText("CANCELLED",{exact:true})).toBeVisible();
  expect(payments).toBe(1);
});
