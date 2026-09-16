"use client";
import {useEffect,useState} from "react";
import {affiliateHistory,AffiliateCommission,AffiliatePayout,AffiliateReferral} from "@/services/affiliate";
import {apiErrorMessage} from "@/lib/api-error";
import {Button} from "@/components/ui/button";
import {envelopePageList} from "@/lib/api-envelope";
type Item=Partial<AffiliateCommission&AffiliatePayout&AffiliateReferral>;
const historyItem=(value:unknown):Item|null=>{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const item=value as Record<string,unknown>,id=Number(item.id);if(!Number.isFinite(id))return null;
 const result:Record<string,unknown>={id};
 for(const key of ["invoiceRef","payoutNumber","status","campaign","currency","earnedAt","registeredAt","requestedAt","paymentReference","notes"])if(typeof item[key]==="string")result[key]=item[key];
 for(const key of ["commissionAmount","amount"])if(Number.isFinite(Number(item[key])))result[key]=Number(item[key]);
 return result as Item;
};
export default function AffiliateHistory({userId}:{userId?:number}){
 const [ledger,setLedger]=useState("commissions"),[page,setPage]=useState(0),[pages,setPages]=useState(0),[total,setTotal]=useState(0),[rows,setRows]=useState<Item[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[retry,setRetry]=useState(0);
 useEffect(()=>{let current=true;setBusy(true);setError(null);void affiliateHistory(ledger,page,userId).then(r=>{if(current){setRows(envelopePageList<unknown>(r).map(historyItem).filter((item):item is Item=>item!==null));setPages(Math.max(0,Number.isFinite(Number(r.data?.totalPages))?Number(r.data?.totalPages):0));setTotal(Math.max(0,Number.isFinite(Number(r.data?.totalElements))?Number(r.data?.totalElements):0))}}).catch(e=>{if(current)setError(apiErrorMessage(e,"History could not be loaded."))}).finally(()=>{if(current)setBusy(false)});return()=>{current=false}},[ledger,page,userId,retry]);
 return <section className="space-y-3 rounded border p-4"><h3 className="font-semibold">Full affiliate history</h3><select aria-label="Affiliate ledger" value={ledger} onChange={e=>{setLedger(e.target.value);setPage(0)}} className="rounded border p-2"><option value="commissions">Commissions</option><option value="referrals">Referrals</option><option value="payouts">Payouts</option></select>{error?<div role="alert">{error}<Button variant="outline" onClick={()=>setRetry(retry+1)}>Retry history</Button></div>:busy?<p>Loading history…</p>:<><p>{total} records</p>{rows.map(r=><div key={r.id} className="rounded border p-3"><b>{r.invoiceRef??r.payoutNumber??`Referral #${r.id}`}</b><p>{r.status}{r.campaign?" · "+r.campaign:""}</p>{r.currency&&<p>{r.currency} {r.commissionAmount??r.amount}</p>}<p className="text-xs text-slate-500">{r.earnedAt??r.registeredAt??r.requestedAt}</p>{r.paymentReference&&<p>External reference: {r.paymentReference}</p>}{r.notes&&<p>{r.notes}</p>}</div>)}{!rows.length&&<p>No matching history.</p>}</>}<div className="flex items-center gap-3"><Button disabled={busy||page===0} variant="outline" onClick={()=>setPage(page-1)}>Previous history</Button><span>Page {pages?page+1:0} / {pages}</span><Button disabled={busy||page+1>=pages} variant="outline" onClick={()=>setPage(page+1)}>Next history</Button></div></section>;
}
