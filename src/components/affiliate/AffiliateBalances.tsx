"use client";
import {useEffect,useState} from "react";
import {affiliateBalances,AffiliateBalance} from "@/services/affiliate";
import {apiErrorMessage} from "@/lib/api-error";
import {Button} from "@/components/ui/button";
export default function AffiliateBalances(){
 const [rows,setRows]=useState<AffiliateBalance[]>([]),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let current=true;setLoading(true);setError(null);void affiliateBalances().then(r=>{if(current)setRows(r.data?.data??[])}).catch(e=>{if(current)setError(apiErrorMessage(e,"Currency balances could not be loaded."))}).finally(()=>{if(current)setLoading(false)});return()=>{current=false}},[retry]);
 return <section className="space-y-3 rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">Balances by currency</h2><p className="text-sm text-slate-500">Currencies are never combined or converted automatically.</p>{error?<p role="alert">{error}<Button variant="outline" onClick={()=>setRetry(v=>v+1)}>Retry balances</Button></p>:loading?<p>Loading balances…</p>:rows.length?rows.map(b=><div key={b.currency} className="rounded border p-3"><b>{b.currency}</b><p>Available {b.available} · pending clearance {b.pending} · lifetime {b.lifetime} · pending payouts {b.pendingPayouts}</p>{!b.payoutSupported&&<p className="text-amber-700">Payouts for this currency need an approved policy; it is not included in your payout request.</p>}</div>):<p>No commission entries yet.</p>}</section>;
}
