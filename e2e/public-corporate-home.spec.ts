import {expect,test} from "@playwright/test";

test("public homepage leads with the complete Slickhood ecosystem",async({page})=>{
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Manage property. Enable communities. Grow wealth."})).toBeVisible();
  await expect(page.getByText("More than property search.",{exact:true})).toBeVisible();
  for(const capability of ["Property Management","Estate Management","Property Sales","Wealth Management","Visitor Hub","Marketplace: Soko & Services","Partner Insurance Hub","Affiliate Network"]){await expect(page.getByRole("heading",{name:capability,exact:true})).toBeVisible()}
  await expect(page.getByRole("heading",{name:"Service Hub",exact:true})).toHaveCount(0);
  await expect(page.getByRole("link",{name:/Looking for property/})).toHaveAttribute("href","#properties");
  await expect(page.getByRole("link",{name:"Get started",exact:true}).first()).toHaveAttribute("href","/role");
});

test("public navigation keeps property discovery secondary and available",async({page})=>{
  await page.goto("/");
  const navigation=page.getByRole("navigation",{name:"Main navigation"});
  await expect(navigation.getByRole("link",{name:"Ecosystem"})).toHaveAttribute("href","/#ecosystem");
  await expect(navigation.getByRole("link",{name:"Who it’s for"})).toHaveAttribute("href","/#businesses");
  await expect(navigation.getByRole("link",{name:"Properties",exact:true})).toHaveAttribute("href","/properties/rent");
  await expect(navigation.getByRole("link",{name:"Search property",exact:true})).toHaveCount(0);
  await expect(page.getByRole("heading",{name:"Find a property to rent or buy."})).toBeVisible();
  await expect(page.getByRole("link",{name:"Homes to rent",exact:true}).first()).toHaveAttribute("href","/properties/rent");
  await expect(page.getByRole("link",{name:"Property for sale",exact:true}).first()).toHaveAttribute("href","/properties/buy");
  await expect(page.locator("main")).toHaveCount(1);
});

test("property catalogue makes rental and sale journeys explicit",async({page})=>{
  await page.goto("/properties/rent");
  await expect(page.getByRole("heading",{name:"Homes to rent"})).toBeVisible();
  const listingTypes=page.getByRole("navigation",{name:"Property listing type"});
  await expect(listingTypes.getByRole("link",{name:"Homes to rent"})).toHaveAttribute("aria-current","page");
  await expect(listingTypes.getByRole("link",{name:"Property for sale"})).toHaveAttribute("href","/properties/buy");
  await expect(page.getByLabel("Minimum price")).toBeVisible();
  await expect(page.getByLabel("Maximum price")).toBeVisible();
  await expect(page.getByRole("link",{name:"Clear",exact:true})).toHaveAttribute("href","/properties/rent");
});

test("mobile navigation has one clear property entry",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await page.locator('summary[aria-label="Open navigation"]').click();
  const navigation=page.getByRole("navigation",{name:"Mobile navigation"});
  await expect(navigation.getByRole("link",{name:"Properties",exact:true})).toHaveAttribute("href","/properties/rent");
  await expect(navigation.getByRole("link",{name:"Search property",exact:true})).toHaveCount(0);
});
