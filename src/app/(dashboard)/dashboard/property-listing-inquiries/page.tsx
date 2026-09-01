"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/lib/api";

type Inquiry={id:number;listingSlug:string;listingHeadline:string;name:string;email:string;phone?:string;message:string;status:"NEW"|"CONTACTED"|"CLOSED";createdOn:string};
export default function ListingInquiriesPage(){
 const[items,setItems]=useState<Inquiry[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState<number>();
 const load=useCallback(async()=>{setLoading(true);try{const{data}=await API.get("/property/listings/inquiries?size=50");setItems(data.content||[]);}catch{toast.error("Could not load listing enquiries");}finally{setLoading(false);}},[]);
 useEffect(()=>{
  // This effect intentionally starts synchronization with the authenticated listing API.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  void load();
 },[load]);
 async function update(id:number,status:Inquiry["status"]){setBusy(id);try{await API.put(`/property/listings/inquiries/${id}/status`,{status});setItems(current=>current.map(item=>item.id===id?{...item,status}:item));toast.success("Enquiry updated");}catch{toast.error("Could not update the enquiry");}finally{setBusy(undefined);}}
 return <div className="mx-auto max-w-6xl space-y-7 p-5 sm:p-8"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-[#EF4217]">Property website</p><h1 className="mt-2 text-3xl font-black text-[#141130]">Listing enquiries</h1><p className="mt-2 text-sm text-slate-500">Follow up viewing requests received from your live Slickhood listings.</p></div>{loading?<div className="grid min-h-56 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-[#EF4217]"/></div>:items.length===0?<div className="rounded-2xl border border-dashed p-12 text-center text-slate-500">New enquiries will appear here after a visitor contacts you.</div>:<div className="grid gap-4">{items.map(item=><article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.status==="NEW"?"bg-orange-50 text-orange-700":item.status==="CONTACTED"?"bg-blue-50 text-blue-700":"bg-slate-100 text-slate-600"}`}>{item.status}</span><span className="text-xs text-slate-400">{new Date(item.createdOn).toLocaleString()}</span></div><h2 className="mt-3 text-lg font-bold text-[#141130]">{item.name}</h2><Link href={`/property/${item.listingSlug}`} target="_blank" className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-[#EF4217]">{item.listingHeadline}<ExternalLink className="h-3.5 w-3.5"/></Link></div><div className="flex gap-2"><a href={`mailto:${item.email}`} className="rounded-lg border p-2.5 text-slate-600" aria-label={`Email ${item.name}`}><Mail className="h-4 w-4"/></a>{item.phone&&<a href={`tel:${item.phone}`} className="rounded-lg border p-2.5 text-slate-600" aria-label={`Call ${item.name}`}><Phone className="h-4 w-4"/></a>}</div></div><p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{item.message}</p><div className="mt-4 flex justify-end gap-2">{item.status==="NEW"&&<button disabled={busy===item.id} onClick={()=>update(item.id,"CONTACTED")} className="rounded-lg border border-[#EF4217] px-3 py-2 text-xs font-bold text-[#EF4217]">Mark contacted</button>}{item.status!=="CLOSED"&&<button disabled={busy===item.id} onClick={()=>update(item.id,"CLOSED")} className="rounded-lg bg-[#141130] px-3 py-2 text-xs font-bold text-white">Close enquiry</button>}</div></article>)}</div>}</div>;
}
