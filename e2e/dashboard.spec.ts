import {expect,test} from "@playwright/test";
import {authenticated,envelope} from "./support";

const iso=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const plusDays=(value:string,days:number)=>{const date=new Date(`${value}T12:00:00`);date.setDate(date.getDate()+days);return iso(date)};
const definition=(code:string,dateMode:"HISTORICAL"|"FORWARD"|"SNAPSHOT")=>({code,title:code.replaceAll("_"," "),description:"Operational insight",category:"Operations",supportsDateRange:true,dateMode,availableToRoles:["Property Manager"]});

test("dashboard maps role metrics, preserves partial insights, and uses a forward lease horizon",async({context,page})=>{
 await authenticated(context,page,{title:"Property Manager",permissions:[]});
 const today=iso(new Date());let leaseRange:{from:string|null;to:string|null}|undefined;
 const lease=definition("LEASE_EXPIRY","FORWARD"),sales=definition("SALES_PIPELINE","HISTORICAL"),failed=definition("INVOICE_COLLECTIONS","HISTORICAL");
 await page.route("**/dash/totals**",route=>route.fulfill({json:envelope([{totalManagedUnits:18,totalManagedProperties:4,totalOccupiedUnits:15,totalPendingLeaseSigns:3}])}));
 await page.route("**/reports/catalog",route=>route.fulfill({json:envelope([lease,sales,failed])}));
 await page.route("**/reports/LEASE_EXPIRY**",route=>{const url=new URL(route.request().url());leaseRange={from:url.searchParams.get("from"),to:url.searchParams.get("to")};return route.fulfill({json:envelope([{definition:lease,from:today,to:plusDays(today,90),generatedAt:new Date().toISOString(),metrics:{Records:1},columns:["Lease","Unit","Expiry"],rows:[{Lease:"L-22",Unit:"A-4",Expiry:plusDays(today,20)}],truncated:false,rowLimit:500}])})});
 await page.route("**/reports/SALES_PIPELINE**",route=>route.fulfill({json:envelope([{definition:sales,from:plusDays(today,-30),to:today,generatedAt:new Date().toISOString(),metrics:{Records:2},columns:["Reference","Status","Date"],rows:[{Reference:"SALE-1",Status:"OFFERED",Date:today},{Reference:"SALE-2",Status:"COMPLETED",Date:today}],truncated:false,rowLimit:500}])}));
 await page.route("**/reports/INVOICE_COLLECTIONS**",route=>route.fulfill({status:503,json:{message:"Unavailable"}}));
 await page.goto("/dashboard");
 await expect(page.getByRole("heading",{name:"Property Manager dashboard"})).toBeVisible();
 await expect(page.getByText("Managed properties")).toBeVisible();await expect(page.getByText("18",{exact:true})).toBeVisible();
 await expect(page.getByRole("img",{name:"SALES PIPELINE status distribution"})).toBeVisible();
 await expect(page.getByText(/live insight is temporarily unavailable/i)).toBeVisible();
 await expect(page.getByText("Lease L-22 · Unit A-4")).toBeVisible();
 expect(leaseRange).toEqual({from:today,to:plusDays(today,90)});
});
