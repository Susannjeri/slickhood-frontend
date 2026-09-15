"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api-error";
import { adminRiderKyc, myRiderKyc, reviewRiderKyc, RiderKycChecklist, uploadRiderKyc } from "@/services/soko";

const label=(value:string)=>value.replaceAll("_"," ").toLowerCase();
export default function RiderKycPanel({riderId}:{riderId?:number}) {
  const [checklist,setChecklist]=useState<RiderKycChecklist>();
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[loadError,setLoadError]=useState("");
  const [notes,setNotes]=useState<Record<number,string>>({}),[expiry,setExpiry]=useState<Record<number,string>>({});
  const load=useCallback(async()=>{
    setLoading(true);setLoadError("");
    try{const r=await (riderId?adminRiderKyc(riderId):myRiderKyc());const data=Array.isArray(r.data?.data)?r.data.data[0]:null;
      if(!data||!Array.isArray(data.documents)||!Array.isArray(data.outstanding)||!Array.isArray(data.uploadTypes))throw new Error("Invalid rider checklist");setChecklist(data);
    }catch(e){setLoadError(apiErrorMessage(e,"Rider verification could not be loaded. Ask the merchant to add your SlickHood email first, then retry."));}
    finally{setLoading(false);}
  },[riderId]);
  useEffect(()=>{void load();},[load]);
  async function upload(type:string,file?:File){if(!file||busy)return;setBusy(true);try{await uploadRiderKyc(type,file);toast.success("Document saved for admin review. Your existing account KYC is unchanged.");await load();}catch(e){toast.error(apiErrorMessage(e,"The rider document could not be saved."));}finally{setBusy(false);}}
  async function review(id:number,decision:"VERIFY"|"REJECT"){
    if(busy)return;if(!notes[id]?.trim())return toast.error("Record what you checked or explain why the document was rejected.");
    setBusy(true);try{await reviewRiderKyc(id,decision,notes[id].trim(),expiry[id]?`${expiry[id]}T23:59:59Z`:undefined);toast.success("Evidence review saved. Rider activation remains an admin decision.");await load();}catch(e){toast.error(apiErrorMessage(e,"The review could not be saved."));}finally{setBusy(false);}
  }
  return <section className="space-y-4 rounded-2xl border bg-white p-5">
    <div className="flex justify-between gap-3"><div><h2 className="text-lg font-bold">Rider KYC checklist</h2><p className="text-sm text-slate-500">This reuses your existing KYC. Only missing or expired rider-specific evidence needs an upload.</p></div><button disabled={loading||busy} onClick={()=>void load()} className="rounded-lg border px-3 py-2">Refresh checklist</button></div>
    {loading&&<p role="status">Checking saved evidence…</p>}
    {loadError&&<p role="alert" className="text-red-700">{loadError}</p>}
    {!loading&&!loadError&&checklist&&<>
      <p className={checklist.commonKycApproved?"text-emerald-700":"text-amber-700"}>{checklist.commonKycApproved?"Common account KYC approved — reused":"Complete the existing account KYC before uploading rider evidence."}</p>
      <p className="text-sm">{checklist.outstanding.length?`Outstanding requirements: ${checklist.outstanding.join(", ")}`:"All required evidence is ready. Admin must still activate the rider before assignment."}</p>
      {checklist.documents.map(d=><article key={`${d.status}-${d.id}`} className="space-y-2 rounded-xl border p-3"><div className="flex flex-wrap justify-between gap-2"><b className="capitalize">{label(d.documentType)}</b><span className="text-sm capitalize">{label(d.status)}</span></div>
        {d.reviewNotes&&<p className="text-sm text-slate-600">Review note: {d.reviewNotes}</p>}{d.expiresAt&&<p className="text-xs">Expires: {new Date(d.expiresAt).toLocaleDateString()}</p>}
        {d.downloadUrl&&<a href={d.downloadUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline">View private document</a>}
        {riderId&&d.status==="PENDING_REVIEW"&&<div className="space-y-2"><textarea aria-label={`Review notes ${d.id}`} value={notes[d.id]??""} maxLength={1000} onChange={e=>setNotes({...notes,[d.id]:e.target.value})} placeholder="Record the authenticity and identity checks, or the rejection reason." className="w-full rounded-lg border p-2"/><label className="block text-sm">Document expiry (if shown)<input aria-label={`Document expiry ${d.id}`} type="date" value={expiry[d.id]??""} onChange={e=>setExpiry({...expiry,[d.id]:e.target.value})} className="ml-2 rounded-lg border p-2"/></label><button disabled={busy} onClick={()=>void review(d.id,"VERIFY")} className="rounded-lg bg-emerald-600 px-3 py-2 text-white">Approve evidence</button><button disabled={busy} onClick={()=>void review(d.id,"REJECT")} className="ml-2 rounded-lg border px-3 py-2 text-red-700">Reject evidence</button></div>}
      </article>)}
      {!riderId&&checklist.uploadTypes.map(type=>{
        const saved=checklist.documents.some(d=>d.documentType===type&&!["REJECTED","EXPIRED"].includes(d.status));
        // A matrix renewal can make evidence outstanding even before a document's printed expiry.
        const needsRenewal=Boolean(checklist.renewalDocumentTypes?.includes(type))&&!checklist.documents.some(d=>d.documentType===type&&d.status==="PENDING_REVIEW");
        return <label key={type} className="block rounded-xl bg-slate-50 p-3 text-sm font-semibold capitalize">{label(type)}{saved&&!needsRenewal?<p className="font-normal text-slate-500">Saved evidence reused — no upload needed.</p>:<input disabled={busy||!checklist.commonKycApproved} type="file" accept="application/pdf,image/jpeg,image/png" onChange={e=>void upload(type,e.target.files?.[0])} className="mt-2 block w-full font-normal"/>}</label>;
      })}
    </>}
  </section>;
}
