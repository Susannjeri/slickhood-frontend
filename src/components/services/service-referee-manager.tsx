"use client";
import { useCallback,useEffect,useRef,useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api-error";
import { getServiceReadiness,listServiceReferees,removeServiceReferee,saveServiceReferee,ServiceReferee } from "@/services/serviceProvider";

export default function ServiceRefereeManager({token,serviceId,required,onCount}:{token:string;serviceId:number;required:number;onCount:(count:number|null)=>void}){
  const [rows,setRows]=useState<ServiceReferee[]>([]),[busy,setBusy]=useState(false),[loadError,setLoadError]=useState("");
  const [editing,setEditing]=useState<number>(),[name,setName]=useState(""),[contact,setContact]=useState("");
  const onCountRef=useRef(onCount);useEffect(()=>{onCountRef.current=onCount;},[onCount]);
  const load=useCallback(async()=>{
    setLoadError("");onCountRef.current(null);
    try{const [r,check]=await Promise.all([listServiceReferees(token),getServiceReadiness(token,serviceId)]);const summary=Array.isArray(check.data?.data)?check.data.data[0]:null;if(!Array.isArray(r.data?.data)||typeof summary?.refereeCount!=="number")throw new Error("Invalid referee response");setRows(r.data.data);onCountRef.current(summary.refereeCount);}
    catch(e){setLoadError(apiErrorMessage(e,"Saved referees could not be loaded. Retry before continuing."));}
  },[token,serviceId]);
  useEffect(()=>{void load();},[load]);
  async function save(){if(busy)return;if(!name.trim()||!contact.trim())return toast.error("Enter the referee's name and phone number or email.");setBusy(true);try{await saveServiceReferee(token,{name:name.trim(),contact:contact.trim()},editing);setName("");setContact("");setEditing(undefined);await load();toast.success("Referee saved. Existing referees are reused across your services.");}catch(e){toast.error(apiErrorMessage(e,"Referee could not be saved."));}finally{setBusy(false);}}
  async function remove(r:ServiceReferee){if(busy||!window.confirm(`Remove ${r.name}?`))return;setBusy(true);try{await removeServiceReferee(token,r.id);await load();}catch(e){toast.error(apiErrorMessage(e,"Referee could not be removed."));}finally{setBusy(false);}}
  return <section className="space-y-3"><h3 className="font-bold">Service referees</h3><p className="text-sm text-slate-500">{required} required. Saved referees are shared across your services; approved referees are not requested again.</p>{loadError&&<p role="alert" className="text-red-700">{loadError}<button onClick={()=>void load()} className="ml-2 underline">Retry</button></p>}
    {rows.map(r=><div key={r.id} className="rounded-xl border p-3"><b>{r.name}</b><p className="text-sm">{r.contact} · {r.verificationStatus.toLowerCase()}</p>{["PENDING","REJECTED"].includes(r.verificationStatus)&&<div className="mt-2 flex gap-3"><button disabled={busy} onClick={()=>{setEditing(r.id);setName(r.name);setContact(r.contact);}} className="text-sm text-blue-700">Edit referee</button><button disabled={busy} onClick={()=>void remove(r)} className="text-sm text-red-700">Remove referee</button></div>}</div>)}
    <div className="space-y-2 rounded-xl bg-slate-50 p-3"><input aria-label="Referee full name" placeholder="Referee full name" maxLength={150} value={name} onChange={e=>setName(e.target.value)} className="w-full rounded-lg border p-2"/><input aria-label="Referee contact" placeholder="Phone number or email" maxLength={200} value={contact} onChange={e=>setContact(e.target.value)} className="w-full rounded-lg border p-2"/><button disabled={busy} onClick={()=>void save()} className="rounded-lg bg-[#020B2D] px-4 py-2 text-white">{busy?"Saving…":editing?"Save referee changes":"Add referee"}</button>{editing&&<button disabled={busy} onClick={()=>{setEditing(undefined);setName("");setContact("");}} className="ml-2 rounded-lg border px-3 py-2">Cancel edit</button>}</div>
  </section>;
}
