"use client";

import {useCallback,useEffect,useState} from "react";
import {useAuthStore} from "@/store/authStore";
import {PendingService} from "@/types/service";
import {apiErrorMessage} from "@/lib/api-error";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {getServiceDetails,approveService,rejectService,getAdminServiceDocuments,verifyAdminServiceDocument,getAdminServiceReferees,verifyAdminServiceReferee,getAdminServiceTiers,updateServiceTier,AdminServiceDocument,ServiceReferee,ServiceReadiness} from "@/services/serviceProvider";

type Details={service:PendingService;readiness:ServiceReadiness;outstandingMatrixRequirements?:string[]};
type Props={service:PendingService|null;onClose:()=>void;onSuccess:()=>void};
export default function ServiceReviewModal({service,onClose,onSuccess}:Props){
 const {token,permissions}=useAuthStore();
 const [details,setDetails]=useState<Details|null>(null),[documents,setDocuments]=useState<AdminServiceDocument[]>([]),[referees,setReferees]=useState<ServiceReferee[]>([]);
 const [tiers,setTiers]=useState<{name:string}[]>([]),[tier,setTier]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[reason,setReason]=useState("");
 const [documentPage,setDocumentPage]=useState(0),[documentPages,setDocumentPages]=useState(0),[refereePage,setRefereePage]=useState(0),[refereePages,setRefereePages]=useState(0);
 const canViewDocuments=permissions.includes("view_sp_document"),canVerifyDocuments=permissions.includes("verify_sp_document"),canVerifyReferees=permissions.includes("verify_sp_referee"),canAssignTier=permissions.includes("assign_sp_tier");
 const load=useCallback(async()=>{
  if(!service||!token)return;
  setLoading(true);setError(null);setDetails(null);
  try{
   const [review,docs,refs,tierOptions]=await Promise.all([
    getServiceDetails(token,service.id),
    canViewDocuments?getAdminServiceDocuments(token,service.id,documentPage):Promise.resolve(null),
    canVerifyReferees?getAdminServiceReferees(token,service.profileId,refereePage):Promise.resolve(null),
    canAssignTier?getAdminServiceTiers(token):Promise.resolve(null),
   ]);
   if(!review.data?.data?.service||!review.data?.data?.readiness)throw new Error("The review response is incomplete.");
   setDetails(review.data.data);setTier(review.data.data.service.tier??"");
   setDocuments(docs?.data?.data??[]);setDocumentPages(docs?.data?.totalPages??0);
   setReferees(refs?.data?.data??[]);setRefereePages(refs?.data?.totalPages??0);setTiers(tierOptions?.data?.data??[]);
  }catch(e){setError(apiErrorMessage(e,"Review details could not be loaded. Retry before making a decision."));}
  finally{setLoading(false);}
 },[service,token,canViewDocuments,canVerifyReferees,canAssignTier,documentPage,refereePage]);
 useEffect(()=>{void load();},[load]);
 async function act(action:()=>Promise<unknown>,close=false){
  if(busy)return;setBusy(true);setError(null);
  try{await action();onSuccess();if(close)onClose();else await load();}
  catch(e){setError(apiErrorMessage(e,"This action could not be completed. Check the outstanding requirements and retry."));}
  finally{setBusy(false);}
 }
 if(!service)return null;
 const readiness=details?.readiness;
 const reviewable=!!details&&["SUBMITTED","UNDER_REVIEW"].includes(details.service.status);
 const ready=reviewable&&readiness?.outstandingDocumentTypes.length===0&&!details?.outstandingMatrixRequirements?.length&&(readiness?.verifiedRefereeCount??0)>=(readiness?.requiredReferees??0);
 const pageControls=(label:string,page:number,pages:number,setPage:(value:number)=>void)=><div className="mt-2 flex items-center gap-3"><Button variant="outline" disabled={busy||loading||page===0} onClick={()=>setPage(page-1)}>Previous {label}</Button><span>{pages? page+1:0} / {pages}</span><Button variant="outline" disabled={busy||loading||page+1>=pages} onClick={()=>setPage(page+1)}>Next {label}</Button></div>;
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose()}}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
  <DialogHeader><DialogTitle>Review Pending Service</DialogTitle><DialogDescription>Inspect supporting evidence before approving. Reused approved KYC is recognised; do not request it again.</DialogDescription></DialogHeader>
  {error&&<div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm">{error}<Button variant="outline" className="ml-2" disabled={busy||loading} onClick={()=>void load()}>Retry review</Button></div>}
  {loading&&<p>Loading service details…</p>}
  {details&&!loading&&<>
   <div className="rounded border p-4"><h3 className="font-semibold">{details.service.serviceProviderName} · {details.service.categoryName}</h3><p>{details.service.currency} {details.service.amount} / {details.service.pricingUnit} · {details.service.status}</p><p>Risk: {details.service.riskLabel??"Not assessed"}</p></div>
   <section className="rounded border p-4"><h3 className="font-semibold">Requirements and reused KYC</h3><p>Approved documents: {readiness?.verifiedDocumentTypes.join(", ")||"None recorded"}</p><p>Uploaded documents: {readiness?.uploadedDocumentTypes.join(", ")||"None recorded"}</p><p>Outstanding approval requirements: {readiness?.outstandingDocumentTypes.join(", ")||"None"}</p><p>Confirmed referees: {readiness?.verifiedRefereeCount} / {readiness?.requiredReferees}</p><p className="mt-2 text-xs text-slate-500">Common KYC and machine-evaluated matrix requirements are also rechecked by the server when approving.</p></section>
   {!!details.outstandingMatrixRequirements?.length&&<p role="status" className="rounded border p-3 text-amber-700">Outstanding common/category KYC: {details.outstandingMatrixRequirements.join(", ")}</p>}
   <section><h3 className="font-semibold">Supporting documents</h3>{!canViewDocuments?<p>Your current role cannot view these documents. An authorised reviewer must verify outstanding evidence.</p>:<>
    {documents.map(d=><div key={d.id} className="my-2 rounded border p-3"><p>{d.documentType} · {d.verificationStatus}{d.expiryDate? " · expires "+new Date(d.expiryDate).toLocaleDateString():""}</p>{d.downloadUrl&&<a href={d.downloadUrl} target="_blank" rel="noopener noreferrer" className="mr-3 underline">View document</a>}{canVerifyDocuments&&d.verificationStatus!=="REJECTED"&&<>
     <Button variant="outline" disabled={busy||!!(d.expiryDate&&Date.parse(d.expiryDate)<=Date.now())} onClick={()=>void act(()=>verifyAdminServiceDocument(token!,d.id,"VERIFIED"))}>Verify document</Button>
     <Button variant="destructive" disabled={busy} onClick={()=>void act(()=>verifyAdminServiceDocument(token!,d.id,"REJECTED"))}>Reject document</Button>
    </>}</div>)}
    {!documents.length&&<p>No documents uploaded for this service. Approved common/reused evidence is shown above.</p>}
    {pageControls("documents",documentPage,documentPages,setDocumentPage)}
   </>}</section>
   <section><h3 className="font-semibold">Referees</h3>{!canVerifyReferees?<p>Your current role cannot inspect or verify referee details.</p>:<>
    {referees.map(r=><div key={r.id} className="my-2 rounded border p-3"><p>{r.name} · {r.contact} · {r.verificationStatus}</p>{r.verificationStatus!=="REJECTED"&&["CONTACTED","CONFIRMED","REJECTED"].map(status=><Button key={status} variant={status==="REJECTED"?"destructive":"outline"} disabled={busy} onClick={()=>void act(()=>verifyAdminServiceReferee(token!,r.id,status))}>{status==="CONFIRMED"?"Confirm referee":status==="CONTACTED"?"Mark contacted":"Reject referee"}</Button>)}</div>)}
    {!referees.length&&<p>No referees recorded.</p>}{pageControls("referees",refereePage,refereePages,setRefereePage)}
   </>}</section>
   {canAssignTier&&<section><label htmlFor="review-service-tier">Service tier</label><select id="review-service-tier" value={tier} disabled={busy} onChange={e=>setTier(e.target.value)} className="mx-2 rounded border p-2"><option value="">Select active tier</option>{tiers.map(t=><option key={t.name} value={t.name}>{t.name}</option>)}</select><Button variant="outline" disabled={busy||!tier} onClick={()=>void act(()=>updateServiceTier(token!,service.id,tier))}>Assign tier</Button></section>}
   {!ready&&reviewable&&<p className="text-sm text-amber-700">Resolve outstanding approval requirements before approving.</p>}
   <label htmlFor="service-rejection-reason">Rejection reason</label><textarea id="service-rejection-reason" maxLength={1000} disabled={busy} value={reason} onChange={e=>setReason(e.target.value)} className="rounded border p-2" placeholder="Required only when rejecting"/>
  </>}
  <div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button variant="destructive" disabled={busy||loading||!reviewable||!reason.trim()} onClick={()=>void act(()=>rejectService(token!,service.id,reason.trim()),true)}>Reject service</Button><Button disabled={busy||loading||!ready} onClick={()=>void act(()=>approveService(token!,service.id),true)}>Approve Service</Button></div>
 </DialogContent></Dialog>;
}
