"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { estateService } from "@/services/business-workflows.service";
import { EstateServiceCharge, PropertyOwnership } from "@/types/business-workflows";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiErrorMessage } from "@/lib/api-error";

export default function EstatePage(){
 const permissions=useAuthStore(s=>s.permissions); const canManage=permissions.includes("manage_estate");
 const [items,setItems]=useState<PropertyOwnership[]>([]); const [busy,setBusy]=useState(false);
 const [charges,setCharges]=useState<EstateServiceCharge[]>([]); const canCharge=permissions.includes("create_service_charge");
 const [propertyId,setPropertyId]=useState(""); const [unitId,setUnitId]=useState(""); const [homeownerUserId,setHomeownerUserId]=useState("");
 const [ownershipStart,setOwnershipStart]=useState(new Date().toISOString().slice(0,10));
 const [chargeOwnershipId,setChargeOwnershipId]=useState(""),[chargeAmount,setChargeAmount]=useState(""),[chargeCurrency,setChargeCurrency]=useState("KES"),[chargeDue,setChargeDue]=useState(new Date().toISOString().slice(0,10)),[chargeDescription,setChargeDescription]=useState("Service charge");
 const load=useCallback(async()=>{try{const [o,c]=await Promise.all([estateService.listOwnership(),estateService.listServiceCharges()]);setItems(o.data?.data??[]);setCharges(c.data?.data??[])}catch(e:unknown){toast.error(apiErrorMessage(e,"Could not load estate records."))}},[]);
 useEffect(()=>{load()},[load]);
 async function create(e:FormEvent){e.preventDefault();setBusy(true);try{await estateService.createOwnership({propertyId:Number(propertyId),unitId:unitId?Number(unitId):undefined,homeownerUserId:Number(homeownerUserId),ownershipStart,source:"ESTATE_ONBOARDING"});toast.success("Homeowner added with ownership history.");setUnitId("");setHomeownerUserId("");await load()}catch(err:unknown){toast.error(apiErrorMessage(err,"Could not add homeowner."))}finally{setBusy(false)}}
 async function end(id:number){const endDate=window.prompt("Ownership end date (YYYY-MM-DD)",new Date().toISOString().slice(0,10));if(!endDate)return;try{await estateService.endOwnership(id,endDate);toast.success("Ownership ended; history was retained.");await load()}catch(err:unknown){toast.error(apiErrorMessage(err,"Could not end ownership."))}}
 async function createCharge(e:FormEvent){e.preventDefault();setBusy(true);try{await estateService.createServiceCharge({ownershipId:Number(chargeOwnershipId),amount:Number(chargeAmount),currency:chargeCurrency,dueDate:chargeDue,description:chargeDescription});toast.success("Service-charge invoice created and sent.");setChargeAmount("");await load()}catch(err:unknown){toast.error(apiErrorMessage(err,"Could not create service charge."))}finally{setBusy(false)}}
 return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6"><div><h1 className="text-3xl font-bold">Estate & homeowners</h1><p className="text-muted-foreground">Current ownership, onboarding and preserved ownership history.</p></div>
 {canManage&&<Card><CardHeader><CardTitle>Add homeowner</CardTitle><CardDescription>Link the homeowner to a property or unit. A previous active unit owner is closed automatically, never deleted.</CardDescription></CardHeader><CardContent><form onSubmit={create} className="grid gap-4 md:grid-cols-4">
  <div><Label>Property ID</Label><Input required type="number" min="1" value={propertyId} onChange={e=>setPropertyId(e.target.value)}/></div>
  <div><Label>Unit ID (optional)</Label><Input type="number" min="1" value={unitId} onChange={e=>setUnitId(e.target.value)}/></div>
  <div><Label>Homeowner user ID</Label><Input required type="number" min="1" value={homeownerUserId} onChange={e=>setHomeownerUserId(e.target.value)}/></div>
  <div><Label>Ownership start</Label><Input required type="date" value={ownershipStart} onChange={e=>setOwnershipStart(e.target.value)}/></div>
  <div className="md:col-span-4"><Button disabled={busy} className="bg-[#EF4217]">Add homeowner</Button></div></form></CardContent></Card>}
 <Card><CardHeader><CardTitle>Ownership records</CardTitle></CardHeader><CardContent className="space-y-3">{items.length===0&&<p className="py-8 text-center text-muted-foreground">No ownership records for this active role.</p>}{items.map(item=><div key={item.id} className="flex flex-col justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"><div><div className="flex gap-2"><strong>Homeowner #{item.homeownerUserId}</strong><Badge variant={item.active?"default":"outline"}>{item.active?"Current":"Historical"}</Badge></div><p className="text-sm text-muted-foreground">Property {item.propertyId}{item.unitId?` · Unit ${item.unitId}`:""} · {item.ownershipStart}{item.ownershipEnd?` to ${item.ownershipEnd}`:" to present"}</p></div>{canManage&&item.active&&<Button size="sm" variant="outline" onClick={()=>end(item.id)}>End ownership</Button>}</div>)}</CardContent></Card>
 {canCharge&&<Card><CardHeader><CardTitle>Create service charge</CardTitle><CardDescription>This creates a real invoice routed to the property owner&apos;s approved payment account.</CardDescription></CardHeader><CardContent><form onSubmit={createCharge} className="grid gap-4 md:grid-cols-5"><div><Label>Ownership ID</Label><Input required type="number" min="1" value={chargeOwnershipId} onChange={e=>setChargeOwnershipId(e.target.value)}/></div><div><Label>Amount</Label><Input required type="number" min="0.01" step="0.01" value={chargeAmount} onChange={e=>setChargeAmount(e.target.value)}/></div><div><Label>Currency</Label><Input value={chargeCurrency} onChange={e=>setChargeCurrency(e.target.value.toUpperCase())}/></div><div><Label>Due date</Label><Input required type="date" value={chargeDue} onChange={e=>setChargeDue(e.target.value)}/></div><div><Label>Description</Label><Input required value={chargeDescription} onChange={e=>setChargeDescription(e.target.value)}/></div><div className="md:col-span-5"><Button disabled={busy}>Create invoice</Button></div></form></CardContent></Card>}
 <Card><CardHeader><CardTitle>Service charges</CardTitle><CardDescription>Payment status and checkout are available in Invoices.</CardDescription></CardHeader><CardContent className="space-y-3">{charges.length===0&&<p className="py-6 text-center text-muted-foreground">No service charges for this role.</p>}{charges.map(c=><div key={c.id} className="flex items-center justify-between rounded border p-3"><div><strong>{c.currency} {c.amount.toLocaleString()}</strong><p className="text-sm text-muted-foreground">{c.description} · Due {c.dueDate} · Invoice #{c.invoiceId}</p></div><Button asChild size="sm" variant="outline"><Link href="/dashboard/invoices">View invoice</Link></Button></div>)}</CardContent></Card>
 </div>
}
