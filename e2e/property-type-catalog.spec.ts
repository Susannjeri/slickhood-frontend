import {expect,test} from "@playwright/test";
import {authenticated,envelope} from "./support";

test("superadmin sees the wrapped property catalogue and saves an audited baseline",async({context,page})=>{
  await authenticated(context,page,{title:"Superadmin",permissions:[]});
  let saved:unknown,baseline:string|undefined;
  const catalog={propertyTypes:[{propertyType:{id:"APARTMENT",name:"Apartment",description:"Residential apartments",category:"RESIDENTIAL",displayOrder:1,common:true},enabledUnitTypeIds:["STUDIO"]}],availableUnitTypes:[{id:"STUDIO",name:"Studio",description:"Studio unit",category:"RESIDENTIAL",displayOrder:1,common:true},{id:"ONE_BEDROOM",name:"One bedroom",description:"One-bedroom unit",category:"RESIDENTIAL",displayOrder:2,common:true}]};
  await page.route("**/property/type/custom",route=>route.fulfill({json:envelope([])}));
  await page.route("**/property/unit/type/catalog",route=>route.fulfill({json:envelope([catalog])}));
  await page.route("**/property/unit/type/catalog/APARTMENT",route=>{saved=route.request().postDataJSON();baseline=route.request().headers()["x-catalog-baseline"];return route.fulfill({json:envelope([])});});
  await page.goto("/dashboard/property-type-catalog");
  await expect(page.getByLabel("Property type")).toHaveValue("APARTMENT");
  await expect(page.getByText("2 enabled")).toHaveCount(0);
  await page.getByLabel("Enable One bedroom").check();
  await expect(page.getByText("2 enabled")).toBeVisible();
  await page.getByRole("button",{name:"Save catalogue"}).click();
  await expect.poll(()=>saved).toEqual(["STUDIO","ONE_BEDROOM"]);
  expect(baseline).toBe("STUDIO");
});

test("invalid catalogue data produces a retryable error instead of an empty selector",async({context,page})=>{
  await authenticated(context,page,{title:"Superadmin",permissions:[]});
  await page.route("**/property/type/custom",route=>route.fulfill({json:envelope([])}));
  await page.route("**/property/unit/type/catalog",route=>route.fulfill({json:envelope([{propertyTypes:[null],availableUnitTypes:["legacy"]}])}));
  await page.goto("/dashboard/property-type-catalog");
  await expect(page.getByText(/The property type catalogue could not be loaded/)).toBeVisible();
  await expect(page.getByRole("button",{name:"Retry catalogue"})).toBeVisible();
});
