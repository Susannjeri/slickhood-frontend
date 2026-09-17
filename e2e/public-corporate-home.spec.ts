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
  await expect(navigation.getByRole("link",{name:"Search property"})).toHaveAttribute("href","/properties/rent");
  await expect(page.getByRole("heading",{name:"Search remains part of the ecosystem."})).toBeVisible();
  await expect(page.getByRole("link",{name:"Rent",exact:true})).toHaveAttribute("href","/properties/rent");
  await expect(page.getByRole("link",{name:"Buy",exact:true})).toHaveAttribute("href","/properties/buy");
});
