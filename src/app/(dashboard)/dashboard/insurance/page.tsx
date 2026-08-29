"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,Building2,Car,FileCheck2,Flame,HeartPulse,House,Plane,RefreshCw,ShieldCheck,Ship,Users} from "lucide-react";
import {insuranceService,InsuranceCompany} from "@/services/insurance.service";
import {apiErrorMessage} from "@/lib/api-error";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Card,CardContent} from "@/components/ui/card";

const products=[
 {name:"Motor Insurance",description:"Cover for private, commercial and PSV vehicles.",Icon:Car,tone:"bg-sky-50 text-sky-700 ring-sky-100"},
 {name:"Domestic Package",description:"Protection for your home, contents and liabilities.",Icon:House,tone:"bg-emerald-50 text-emerald-700 ring-emerald-100"},
 {name:"Fire & Allied Perils",description:"Cover for buildings, stock and business property.",Icon:Flame,tone:"bg-orange-50 text-orange-700 ring-orange-100"},
 {name:"WIBA & EL",description:"Employee injury and employer liability protection.",Icon:Users,tone:"bg-violet-50 text-violet-700 ring-violet-100"},
 {name:"All Risks",description:"Portable equipment and valuables against accidental loss.",Icon:ShieldCheck,tone:"bg-indigo-50 text-indigo-700 ring-indigo-100"},
 {name:"Medical",description:"Health cover options for individuals, families and teams.",Icon:HeartPulse,tone:"bg-rose-50 text-rose-700 ring-rose-100"},
 {name:"Marine Cargo",description:"Protection for goods while in transit.",Icon:Ship,tone:"bg-cyan-50 text-cyan-700 ring-cyan-100"},
 {name:"Travel",description:"Emergency medical and travel disruption protection.",Icon:Plane,tone:"bg-amber-50 text-amber-700 ring-amber-100"},
] as const;

export default function InsuranceHubPage(){
 const [companies,setCompanies]=useState<InsuranceCompany[]>([]),[loading,setLoading]=useState(true);
 async function load(){setLoading(true);try{const r=await insuranceService.companies();setCompanies(r.data?.data??[])}catch(e:unknown){toast.error(apiErrorMessage(e,"Could not load insurance partners."))}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 return <div className="min-h-screen bg-[#f5f8fc] p-3 text-[#10243e] sm:p-6">
  <section className="overflow-hidden rounded-3xl bg-[#0c2d57] px-5 py-8 text-white shadow-xl sm:px-10 sm:py-10 lg:px-14">
   <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_.8fr]"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.28em] text-[#7db8ea]">Silverwood Insurance Agency</p><h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">Insurance protection, made clear and connected.</h1><p className="mt-4 max-w-2xl text-lg text-white/75">Request advice, compare insurer quotations, manage policies, claims and renewals—all through your trusted insurance partner on SlickHood.</p><div className="mt-7 flex flex-wrap gap-3"><Button className="bg-[#1769aa] hover:bg-[#2080ca]">Get a Quote <ArrowRight className="ml-2 size-4"/></Button><Button variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white">My Policies</Button></div></div>
   <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur"><ShieldCheck className="size-12 text-[#7db8ea]"/><h2 className="mt-5 text-2xl font-semibold">Human advice. Digital convenience.</h2><p className="mt-2 text-white/70">Silverwood advisers review each request before quotations are presented. Insurance products and payment destinations cannot be configured by ordinary SlickHood users.</p></div></div>
  </section>

  <section id="products" className="py-10"><div className="mb-5 flex items-end justify-between"><div><p className="text-sm font-semibold text-[#1769aa]">Insurance products</p><h2 className="text-2xl font-bold">What would you like to protect?</h2></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{products.map(({name,description,Icon,tone})=><Card key={name} className="group overflow-hidden border-0 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"><CardContent className="relative p-5"><div aria-hidden="true" className={`flex size-12 items-center justify-center rounded-2xl ring-1 transition-transform duration-200 group-hover:scale-110 ${tone}`}><Icon strokeWidth={1.8} className="size-6"/></div><h3 className="mt-4 font-bold">{name}</h3><p className="mt-2 min-h-10 text-sm text-muted-foreground">{description}</p><button aria-label={`Request a quote for ${name}`} className="mt-4 flex items-center text-sm font-semibold text-[#1769aa]">Request a quote <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-1"/></button></CardContent></Card>)}</div></section>

  <section className="pb-10"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-semibold text-[#1769aa]">Insurance partners</p><h2 className="text-2xl font-bold">Companies available through Silverwood</h2></div><Button variant="ghost" size="sm" onClick={load} disabled={loading}><RefreshCw className={`mr-2 size-4 ${loading?"animate-spin":""}`}/>Refresh</Button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{companies.map(company=><Card key={company.code} className="border-0 shadow-sm"><CardContent className="p-5"><div className="flex size-10 items-center justify-center rounded-xl bg-[#0c2d57] text-white"><Building2 className="size-5"/></div><h3 className="mt-4 font-bold">{company.name}</h3><p className="mt-1 text-xs text-muted-foreground">Quotations and payments coordinated by Silverwood Insurance Agency.</p></CardContent></Card>)}{!loading&&!companies.length&&<p className="text-sm text-muted-foreground">No insurance companies are currently available.</p>}</div></section>

  <section className="mb-8 grid gap-4 md:grid-cols-3">{[["My Quotes","Review adviser-prepared quotations."],["Policies","Access schedules, certificates and wording."],["Claims & Renewals","Track claims and upcoming renewals."]].map(([title,text])=><Card key={title} className="border-[#dbe8f4]"><CardContent className="flex items-center justify-between p-5"><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></div><FileCheck2 className="size-6 text-[#1769aa]"/></CardContent></Card>)}</section>
  <div className="pb-8 text-center text-sm text-muted-foreground"><Link href="/dashboard" className="font-semibold text-[#1769aa]">Back to SlickHood</Link></div>
 </div>
}
