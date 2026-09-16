"use client";
import {FormEvent,ReactElement,cloneElement,useCallback,useEffect,useId,useRef,useState} from "react";
import {Landmark,RefreshCw,ShieldCheck} from "lucide-react";
import {toast} from "sonner";
import {wealthService,WealthAssetType} from "@/services/wealth.service";
import {apiErrorMessage} from "@/lib/api-error";
import {envelopeItem,envelopeList} from "@/lib/api-envelope";
import {Card,CardContent,CardDescription,CardHeader,CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";

type Summary={activeAssets:number;owners:number;vaultDocuments:number;marketPricedAssets:number;activeAssetTypes:number};
const blank={code:"",label:"",description:"",displayOrder:100,marketPricingAllowed:false,active:true};
export default function WealthManagement(){
 const [summary,setSummary]=useState<Summary|null>(null);
 const [types,setTypes]=useState<WealthAssetType[]>([]);
 const [form,setForm]=useState(blank),[editing,setEditing]=useState<number>();
 const [busy,setBusy]=useState(false),[loadError,setLoadError]=useState("");
 const mutationLock=useRef(false);
 const initialLoadStarted=useRef(false);
 const load=useCallback(async()=>{
  setBusy(true);setLoadError("");
  const [s,t]=await Promise.allSettled([wealthService.adminSummary(),wealthService.adminAssetTypes()]);
  const errors:string[]=[];
  if(s.status==="fulfilled"){const value=envelopeItem<Summary|null>(s.value,null);setSummary(value);if(!value)errors.push("Platform totals are unavailable.");}
  else{setSummary(null);errors.push("Platform totals could not be loaded.");}
  if(t.status==="fulfilled")setTypes(envelopeList<WealthAssetType>(t.value));
  else errors.push("The catalogue could not be refreshed. Records shown may be out of date.");
  setLoadError(errors.join(" "));setBusy(false);
 },[]);
 useEffect(()=>{
  // React development checks can invoke mount effects twice. Do not allow the
  // second request to overwrite a genuine first-request failure with stale data.
  if(initialLoadStarted.current)return;
  initialLoadStarted.current=true;
  void load();
 },[load]);
 async function save(e:FormEvent){
  e.preventDefault();if(mutationLock.current||busy||loadError)return;
  mutationLock.current=true;setBusy(true);
  try{
   if(editing)await wealthService.updateAssetType(editing,form);else await wealthService.createAssetType(form);
   setForm(blank);setEditing(undefined);toast.success(editing?"Asset type updated.":"Asset type added.");await load();
  }catch(error){toast.error(apiErrorMessage(error,"The catalogue change could not be saved. Your entries have been kept."));}
  finally{mutationLock.current=false;setBusy(false);}
 }
 async function toggle(type:WealthAssetType){
  if(mutationLock.current||busy||loadError)return;
  if(type.active&&!confirm("Hide this category from new entries? Existing customer assets and history will be preserved."))return;
  mutationLock.current=true;setBusy(true);
  try{
   await wealthService.updateAssetType(type.id,{...type,active:!type.active});
   toast.success(type.active?"Asset type hidden from new entries.":"Asset type restored.");await load();
  }catch(error){toast.error(apiErrorMessage(error,"Asset type could not be updated."));}
  finally{mutationLock.current=false;setBusy(false);}
 }
 function edit(type:WealthAssetType){
  setEditing(type.id);setForm({code:type.code,label:type.label,description:type.description??"",displayOrder:type.displayOrder,marketPricingAllowed:type.marketPricingAllowed,active:type.active});
  document.getElementById("wealth-type-form")?.scrollIntoView({block:"start"});
 }
 return <div className="space-y-6 px-3 py-6">
  <header id="wealth-admin-overview" className="flex scroll-mt-24 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
   <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#FF4B1F]">Private wealth controls</p><h1 className="mt-1 text-3xl font-bold text-[#162B63]">Wealth administration</h1><p className="text-slate-500">Manage the asset catalogue and platform health without exposing anyone&apos;s portfolio or vault documents.</p></div>
   <Button variant="outline" disabled={busy} onClick={()=>void load()}><RefreshCw className={`mr-2 size-4 ${busy?"animate-spin":""}`}/>Refresh</Button>
  </header>
  <nav aria-label="Wealth administration sections" className="flex flex-wrap gap-3">
   <a href="#wealth-admin-overview" className="rounded-xl border px-4 py-2">Overview</a>
   <a href="#wealth-type-catalogue" className="rounded-xl border px-4 py-2">Asset catalogue</a>
   <a href="#wealth-type-form" className="rounded-xl border px-4 py-2">{editing?"Edit asset type":"Add asset type"}</a>
  </nav>
  {busy&&<p role="status">Loading or saving catalogue changes…</p>}
  {loadError&&<div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4">{loadError}<Button variant="outline" disabled={busy} onClick={()=>void load()} className="ml-3">Retry administration</Button></div>}
  {summary&&<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[["Active assets",summary.activeAssets],["Wealth users",summary.owners],["Vault documents",summary.vaultDocuments],["Market priced",summary.marketPricedAssets],["Active types",summary.activeAssetTypes]].map(([label,value])=><Card key={String(label)}><CardContent className="pt-5"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-[#162B63]">{Number(value??0).toLocaleString()}</p></CardContent></Card>)}</div>}
  <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
   <Card id="wealth-type-form" className="scroll-mt-24"><CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="size-5 text-[#FF4B1F]"/>{editing?"Edit asset type":"Add asset type"}</CardTitle><CardDescription>Codes are stable reporting keys. Editing a label never rewrites customer assets.</CardDescription></CardHeader>
    <CardContent><form onSubmit={save} className="space-y-4">
     <Field label="Code"><Input required disabled={Boolean(editing)} pattern="[A-Z][A-Z0-9_]{1,39}" maxLength={40} value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g,"")})}/></Field>
     <Field label="Customer label"><Input required maxLength={100} value={form.label} onChange={e=>setForm({...form,label:e.target.value})}/></Field>
     <Field label="Description"><Input maxLength={500} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></Field>
     <Field label="Display order"><Input required type="number" min={0} step={1} value={form.displayOrder} onChange={e=>setForm({...form,displayOrder:Number(e.target.value)})}/></Field>
     <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.marketPricingAllowed} onChange={e=>setForm({...form,marketPricingAllowed:e.target.checked})}/>Allow live market pricing</label>
     <Button disabled={busy||Boolean(loadError)} className="w-full">{editing?"Save asset type changes":"Add asset type"}</Button>
     {editing&&<Button type="button" variant="outline" disabled={busy} onClick={()=>{setEditing(undefined);setForm(blank);}}>Cancel editing</Button>}
    </form></CardContent>
   </Card>
   <Card id="wealth-type-catalogue" className="scroll-mt-24"><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-emerald-600"/>Asset type catalogue</CardTitle><CardDescription>Hide affects new entries only. Existing assets and history are never deleted.</CardDescription></CardHeader>
    <CardContent className="space-y-3">{types.map(type=><div key={type.id} className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><b>{type.label}</b><Badge variant="outline">{type.code}</Badge><Badge variant={type.active?"secondary":"outline"}>{type.active?"ACTIVE":"HIDDEN"}</Badge>{type.marketPricingAllowed&&<Badge className="bg-blue-600">MARKET</Badge>}</div><p className="mt-1 text-sm text-slate-500">{type.description||"No description"} · order {type.displayOrder}</p></div><div className="flex gap-2"><Button variant="outline" disabled={busy||Boolean(loadError)} aria-label={`Edit ${type.label}`} onClick={()=>edit(type)}>Edit</Button><Button variant="outline" disabled={busy||Boolean(loadError)||editing===type.id} onClick={()=>void toggle(type)}>{type.active?"Hide":"Restore"}</Button></div></div>)}{!busy&&!loadError&&!types.length&&<p>No asset types configured yet. Add the first category.</p>}</CardContent>
   </Card>
  </div>
 </div>;
}
function Field({label,children}:{label:string;children:ReactElement<{id?:string}>}){const id=useId();return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{cloneElement(children,{id})}</div>}
