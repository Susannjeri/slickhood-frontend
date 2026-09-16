"use client";

import {FormEvent,useEffect,useRef,useState} from "react";
import {affiliateDirectory,affiliateDetail,editAffiliate,AffiliateSummary,AffiliateDetail} from "@/services/affiliate";
import AffiliateHistory from "./AffiliateHistory";
import {apiErrorMessage} from "@/lib/api-error";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
import {envelopeItem,envelopePageList} from "@/lib/api-envelope";

export default function AffiliateDirectory(){
  const [rows,setRows]=useState<AffiliateSummary[]>([]),[query,setQuery]=useState(""),[search,setSearch]=useState(""),[status,setStatus]=useState(""),[page,setPage]=useState(0),[pages,setPages]=useState(0),[total,setTotal]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[retry,setRetry]=useState(0);
  const detailRequest=useRef(0);
  const [detail,setDetail]=useState<AffiliateDetail|null>(null),[loadingDetail,setLoadingDetail]=useState(false),[detailError,setDetailError]=useState<string|null>(null),[editing,setEditing]=useState(false),[saving,setSaving]=useState(false),[reason,setReason]=useState(""),[editStatus,setEditStatus]=useState(""),[rate,setRate]=useState(0),[minimum,setMinimum]=useState(0);

  useEffect(()=>{let current=true;setBusy(true);setError(null);void affiliateDirectory({query:search||undefined,status:status||undefined,page}).then(r=>{if(current){setRows(envelopePageList<AffiliateSummary>(r).filter(item=>item&&item.profile));setPages(r.data?.totalPages??0);setTotal(r.data?.totalElements??0)}}).catch(e=>{if(current)setError(apiErrorMessage(e,"Affiliate directory could not be loaded."))}).finally(()=>{if(current)setBusy(false)});return()=>{current=false}},[search,status,page,retry]);
  async function open(row:AffiliateSummary){const request=++detailRequest.current;setLoadingDetail(true);setDetailError(null);setEditing(false);setDetail({affiliate:row,balances:[]});try{const r=await affiliateDetail(row.userId);const next=envelopeItem<AffiliateDetail|null>(r,null);if(!next?.affiliate)throw new Error("Affiliate detail response was empty");if(request===detailRequest.current)setDetail({...next,balances:Array.isArray(next.balances)?next.balances:[]})}catch(e){if(request===detailRequest.current)setDetailError(apiErrorMessage(e,"Affiliate details could not be loaded. Close and retry."))}finally{if(request===detailRequest.current)setLoadingDetail(false)}}
  function edit(){if(!detail)return;setRate(detail.affiliate.profile.commissionRate);setMinimum(detail.affiliate.profile.minimumPayout);setEditStatus(detail.affiliate.profile.status==="PENDING_APPROVAL"?"ACTIVE":detail.affiliate.profile.status);setReason("");setEditing(true)}
  async function save(e:FormEvent){e.preventDefault();if(!detail||saving)return;setSaving(true);setDetailError(null);try{const r=await editAffiliate(detail.affiliate.userId,{status:editStatus,commissionRate:rate,minimumPayout:minimum,reason:reason.trim()});const next=envelopeItem<AffiliateDetail|null>(r,null);if(!next?.affiliate)throw new Error("Affiliate detail response was empty");setDetail({...next,balances:Array.isArray(next.balances)?next.balances:[]});setEditing(false);setRetry(v=>v+1)}catch(e){setDetailError(apiErrorMessage(e,"Affiliate decision could not be saved."))}finally{setSaving(false)}}

  return <section id="affiliate-directory" className="space-y-4 rounded-xl border bg-white p-5">
    <h2 className="text-xl font-semibold">Affiliate applications & directory</h2>
    <p className="text-sm text-slate-500">Approve new applications and manage programme access, referrals, commissions and payout history. Affiliate access is free but remains locked until Superadmin approval.</p>
    <form onSubmit={e=>{e.preventDefault();setSearch(query.trim());setPage(0)}} className="flex flex-wrap gap-3">
      <Input aria-label="Search affiliates" maxLength={160} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, email or referral code" className="max-w-sm"/>
      <select aria-label="Affiliate status" value={status} onChange={e=>{setStatus(e.target.value);setPage(0)}} className="rounded border px-3">
        <option value="">All programme statuses</option><option value="PENDING_APPROVAL">Pending approval</option><option value="ACTIVE">Active</option><option value="REJECTED">Rejected</option><option value="SUSPENDED">Suspended</option><option value="BLACKLISTED">Blacklisted</option><option value="INACTIVE">Inactive</option>
      </select><Button disabled={busy}>Search affiliates</Button>
    </form>
    {error?<div role="alert">{error}<Button variant="outline" onClick={()=>setRetry(retry+1)}>Retry directory</Button></div>:busy?<p>Loading affiliates…</p>:<>
      <p>{total} affiliate applications and profiles</p>
      {rows.map(a=><div key={a.userId} className="flex flex-wrap items-center justify-between gap-3 rounded border p-4"><div><b>{a.name??`Affiliate #${a.userId}`}</b><p>{a.email}</p><p>{String(a.profile.status??"UNKNOWN").replaceAll("_"," ")} · {a.profile.referralCode??"Code pending"}</p><p>{a.referrals??0} referrals · {a.conversions??0} conversions · commission {a.profile.commissionRate??0}%</p></div><Button variant="outline" onClick={()=>void open(a)}>{a.profile.status==="PENDING_APPROVAL"?"Review application":"Manage affiliate"}</Button></div>)}
      {!rows.length&&<p>No affiliate applications match these filters.</p>}
    </>}
    <div className="flex gap-3"><Button variant="outline" disabled={busy||page===0} onClick={()=>setPage(page-1)}>Previous affiliates</Button><p>Page {pages?page+1:0} / {pages}</p><Button variant="outline" disabled={busy||page+1>=pages} onClick={()=>setPage(page+1)}>Next affiliates</Button></div>
    <Dialog open={!!detail} onOpenChange={v=>{if(!v&&!saving){detailRequest.current++;setDetail(null)}}}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{detail?.affiliate.profile.status==="PENDING_APPROVAL"?"Review affiliate application":"Manage affiliate"}</DialogTitle><DialogDescription>Only Superadmin can approve access or change financial settings. Previous financial entries and rates remain intact.</DialogDescription></DialogHeader>
      {loadingDetail?<p>Loading affiliate details…</p>:detail&&<>
        <h3 className="font-semibold">{detail.affiliate.name} · {detail.affiliate.email}</h3>
        <p className="text-sm text-slate-600">Applied {detail.affiliate.profile.appliedAt?new Date(detail.affiliate.profile.appliedAt).toLocaleString():"—"} · Status {detail.affiliate.profile.status.replaceAll("_"," ")}</p>
        {detail.affiliate.profile.reviewNotes&&<p className="rounded border bg-slate-50 p-3 text-sm">Latest review: {detail.affiliate.profile.reviewNotes}</p>}
        {detailError&&<p role="alert" className="text-red-700">{detailError}</p>}
        {detail.balances.map(b=><div key={b.currency} className="rounded border p-3"><b>{b.currency}</b><p>Available {b.available} · pending {b.pending} · lifetime {b.lifetime} · pending payouts {b.pendingPayouts}</p>{!b.payoutSupported&&<p className="text-amber-700">This currency is recorded separately. Payout policy is not configured; no conversion is applied.</p>}</div>)}
        {!detailError&&!editing&&<Button variant="outline" onClick={edit}>{detail.affiliate.profile.status==="PENDING_APPROVAL"?"Review and decide":"Edit access and payment settings"}</Button>}
        {editing&&<form onSubmit={save} className="space-y-3 rounded border p-4">
          <label className="block">Programme decision<select aria-label="Edit affiliate status" disabled={saving} value={editStatus} onChange={e=>setEditStatus(e.target.value)} className="ml-2 rounded border p-2"><option value="ACTIVE">Approve / Active</option><option value="REJECTED">Reject application</option><option value="SUSPENDED">Suspended — temporary block</option><option value="BLACKLISTED">Blacklisted — compliance block</option><option value="INACTIVE">Inactive — programme closed</option></select></label>
          <p className="text-xs text-slate-600">Only Active affiliates can resolve referral links, earn commissions, configure payout accounts or request payouts. Existing balances and payout history are preserved.</p>
          <label className="block">Commission percentage<Input aria-label="Commission percentage" disabled={saving} type="number" required min={0.01} max={100} step={0.01} value={rate} onChange={e=>setRate(Number(e.target.value))}/></label>
          <label className="block">Minimum payout ({detail.affiliate.profile.currency})<Input aria-label="Minimum affiliate payout" disabled={saving} type="number" required min={0.01} step={0.01} value={minimum} onChange={e=>setMinimum(Number(e.target.value))}/></label>
          <label className="block">Reason for decision<textarea aria-label="Affiliate change reason" required maxLength={1000} disabled={saving} value={reason} onChange={e=>setReason(e.target.value)} className="w-full rounded border p-2"/></label>
          <p className="text-xs text-slate-500">New rates apply only to future qualifying payments; existing commissions are not recalculated.</p>
          <Button disabled={saving||!reason.trim()}>Save affiliate decision</Button><Button type="button" variant="outline" disabled={saving} onClick={()=>setEditing(false)}>Cancel changes</Button>
        </form>}
        <AffiliateHistory key={detail.affiliate.userId} userId={detail.affiliate.userId}/>
      </>}
    </DialogContent></Dialog>
  </section>
}
